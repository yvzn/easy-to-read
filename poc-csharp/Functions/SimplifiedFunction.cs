using Microsoft.AspNetCore.Http;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using OpenAI;
using OpenAI.Chat;
using System.ClientModel;

namespace EasyToRead.Functions;

public class SimplifiedFunction
{
    private readonly ILogger<SimplifiedFunction> _logger;

    private static readonly string ResourcesDirectory =
        Path.Combine(AppContext.BaseDirectory, "resources");

    private static readonly Lazy<Task<string>> HtmlTemplateTask = new(
        () => File.ReadAllTextAsync(Path.Combine(ResourcesDirectory, "template.html")));

    private static readonly Lazy<Task<string>> SystemPromptTask = new(
        () => File.ReadAllTextAsync(Path.Combine(ResourcesDirectory, "system-prompt.txt")));

    private static readonly Lazy<Task<string>> UserPromptTask = new(
        () => File.ReadAllTextAsync(Path.Combine(ResourcesDirectory, "user-prompt.txt")));

    private static readonly Uri GitHubModelsEndpoint = new("https://models.github.ai/inference");
    private const string ModelName = "openai/gpt-4o-mini";

    public SimplifiedFunction(ILogger<SimplifiedFunction> logger)
    {
        _logger = logger;
    }

    [Function("simplified")]
    public async Task Run(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "simplified")] HttpRequest req)
    {
        var path = req.Path.Value?.Replace("\r", "").Replace("\n", "") ?? string.Empty;
        _logger.LogInformation("Http function processed request for url \"{Url}\"", path);

        try
        {
            var form = await req.ReadFormAsync();
            var userInput = form["t"].FirstOrDefault();
            var language = form["l"].FirstOrDefault();

            if (string.IsNullOrEmpty(userInput))
            {
                req.HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
                req.HttpContext.Response.ContentType = "text/plain;charset=utf-8";
                await req.HttpContext.Response.WriteAsync("Empty content.");
                return;
            }

            var template = await HtmlTemplateTask.Value;
            var parts = template.Split("-----");
            var htmlHeader = parts[0];
            var htmlFooter = parts.Length > 1 ? parts[1] : string.Empty;

            req.HttpContext.Response.StatusCode = StatusCodes.Status200OK;
            req.HttpContext.Response.ContentType = "text/html;charset=utf-8";
            await req.HttpContext.Response.WriteAsync(htmlHeader);
            await req.HttpContext.Response.Body.FlushAsync();

            var translationInstructions = BuildTranslationInstructions(language);
            // The production system-prompt.txt (deployed via secure file) contains a {0} placeholder
            // for translation instructions. The sample file in the repository does not include it.
            var systemPrompt = (await SystemPromptTask.Value).Replace("{0}", translationInstructions);
            var userPrompt = (await UserPromptTask.Value).Replace("{0}", userInput);

            var token = Environment.GetEnvironmentVariable("GITHUB_TOKEN") ?? string.Empty;
            var openAiClient = new OpenAIClient(
                new ApiKeyCredential(token),
                new OpenAIClientOptions { Endpoint = GitHubModelsEndpoint });
            var chatClient = openAiClient.GetChatClient(ModelName);

            var completion = await chatClient.CompleteChatAsync(
                new List<ChatMessage>
                {
                    new SystemChatMessage(systemPrompt),
                    new UserChatMessage(userPrompt),
                },
                new ChatCompletionOptions
                {
                    Temperature = 1.0f,
                    MaxOutputTokenCount = 12000,
                });

            var content = completion.Value.Content[0].Text;
            await req.HttpContext.Response.WriteAsync(content);
            await req.HttpContext.Response.WriteAsync(htmlFooter);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process simplified request");

            if (!req.HttpContext.Response.HasStarted)
            {
                req.HttpContext.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
                req.HttpContext.Response.ContentType = "text/plain;charset=utf-8";
                await req.HttpContext.Response.WriteAsync(
                    "Service has failed to process the request. Please try again later.");
            }
            else
            {
                await req.HttpContext.Response.WriteAsync(
                    "<api-error>Service has failed to process the request. Please try again later.</api-error>");
            }
        }
    }

    private static string BuildTranslationInstructions(string? language)
    {
        return language switch
        {
            "es" => "The new versions should be translated into Spanish.",
            "fr" => "The new versions should be translated into French.",
            "de" => "The new versions should be translated into German.",
            "en" => "The new versions should be translated into English.",
            _ => "The new versions should be in the same language.",
        };
    }
}
