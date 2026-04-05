using Microsoft.AspNetCore.Http;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using OpenAI;
using OpenAI.Chat;
using System.Reflection;
using System.Text;

namespace EasyToRead.Api.Functions;

public class SimplifiedFunction(OpenAIClient aiClient, ILogger<SimplifiedFunction> logger)
{
    private static readonly Lazy<Task<string>> HtmlTemplateTask =
        new(() => ReadResourceAsync("template.html"));

    private static readonly Lazy<Task<string>> SystemPromptTask =
        new(() => ReadResourceAsync("system-prompt.txt"));

    private static readonly Lazy<Task<string>> UserPromptTask =
        new(() => ReadResourceAsync("user-prompt.txt"));

    [Function("simplified")]
    public async Task Run(
        [HttpTrigger(AuthorizationLevel.Function, "post")] HttpRequest req,
        FunctionContext context)
    {
        logger.LogInformation("Http function processed request for url \"{Url}\"",
            req.Path.Value?.ReplaceLineEndings(string.Empty));

        string? userInput = null;
        string? language = null;
        bool debug = false;

        try
        {
            var form = await req.ReadFormAsync();
            userInput = form["t"];
            language = form["l"];
            debug = form["d"] == "true";
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to read request body");
            req.HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            req.HttpContext.Response.ContentType = "text/plain;charset=utf-8";
            await req.HttpContext.Response.WriteAsync("Invalid request body.");
            return;
        }

        if (string.IsNullOrWhiteSpace(userInput))
        {
            req.HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            req.HttpContext.Response.ContentType = "text/plain;charset=utf-8";
            await req.HttpContext.Response.WriteAsync("Empty content.");
            return;
        }

        req.HttpContext.Response.ContentType = "text/html;charset=utf-8";

        try
        {
            var template = await HtmlTemplateTask.Value;
            var parts = template.Split("-----", 2);
            var htmlHeader = parts[0];
            var htmlFooter = parts.Length > 1 ? parts[1] : string.Empty;

            await req.HttpContext.Response.WriteAsync(htmlHeader);
            await req.HttpContext.Response.Body.FlushAsync();

            var translationInstructions = BuildTranslationInstructions(language);

            var systemPromptTemplate = await SystemPromptTask.Value;
            var systemPrompt = systemPromptTemplate.Replace("{0}", translationInstructions);

            var userPromptTemplate = await UserPromptTask.Value;
            var userPrompt = userPromptTemplate.Replace("{0}", userInput);

            var chatClient = aiClient.GetChatClient(AiSettings.ModelName);

            var messages = new List<ChatMessage>
            {
                new SystemChatMessage(systemPrompt),
                new UserChatMessage(userPrompt),
            };

            var options = new ChatCompletionOptions
            {
                Temperature = 1.0f,
                MaxOutputTokenCount = 12000,
            };

            await foreach (var update in chatClient.CompleteChatStreamingAsync(messages, options))
            {
                foreach (var part in update.ContentUpdate)
                {
                    await req.HttpContext.Response.WriteAsync(part.Text);
                    if (debug)
                    {
                        await req.HttpContext.Response.WriteAsync("\n");
                    }
                }
                await req.HttpContext.Response.Body.FlushAsync();
            }

            await req.HttpContext.Response.WriteAsync(htmlFooter);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to process simplification request");
            await req.HttpContext.Response.WriteAsync(
                "<api-error>Service has failed to process the request. Please try again later.</api-error>");
        }
    }

    private static string BuildTranslationInstructions(string? language) => language switch
    {
        "es" => "The new versions should be translated into Spanish.",
        "fr" => "The new versions should be translated into French.",
        "de" => "The new versions should be translated into German.",
        "en" => "The new versions should be translated into English.",
        _ => "The new versions should be in the same language.",
    };

    private static async Task<string> ReadResourceAsync(string fileName)
    {
        var directory = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location)
            ?? AppContext.BaseDirectory;
        var path = Path.Combine(directory, "Resources", fileName);
        return await File.ReadAllTextAsync(path, Encoding.UTF8);
    }
}
