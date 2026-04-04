using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using OpenAI;
using OpenAI.Chat;
using System.ClientModel;
using System.Net;
using System.Text;

namespace EasyToRead.Api.Functions;

public class Simplified
{
    private const string Endpoint = "https://models.github.ai/inference";
    private const string ModelName = "openai/gpt-4o-mini";
    private const string ResourcesDirectory = "Resources";
    private const string HtmlTemplateSeparator = "-----";

    private readonly ILogger<Simplified> _logger;

    private static readonly Lazy<Task<string>> _htmlTemplateTask =
        new(() => ReadResource("template.html"));
    private static readonly Lazy<Task<string>> _systemPromptTask =
        new(() => ReadResource("system-prompt.txt"));
    private static readonly Lazy<Task<string>> _userPromptTask =
        new(() => ReadResource("user-prompt.txt"));

    public Simplified(ILogger<Simplified> logger)
    {
        _logger = logger;
    }

    [Function("simplified")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "simplified")] HttpRequestData req)
    {
        _logger.LogInformation("Http function processed request for url \"{Url}\"", req.Url);

        try
        {
            var requestBody = await req.ReadAsStringAsync() ?? string.Empty;
            var requestParams = FormDataParser.Parse(requestBody);

            var userInput = requestParams.GetValueOrDefault("t");
            var language = requestParams.GetValueOrDefault("l");
            var debugStr = requestParams.GetValueOrDefault("d");
            var debug = debugStr == "true";

            if (string.IsNullOrEmpty(userInput))
            {
                var badRequest = req.CreateResponse(HttpStatusCode.BadRequest);
                badRequest.Headers.Add("Content-Type", "text/plain;charset=utf-8");
                await badRequest.WriteStringAsync("Empty content.");
                return badRequest;
            }

            var response = req.CreateResponse(HttpStatusCode.OK);
            response.Headers.Add("Content-Type", "text/html;charset=utf-8");

            var htmlContent = await BuildHtmlResponseAsync(userInput, language, debug);
            await response.WriteStringAsync(htmlContent);

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing simplified request");

            var errorResponse = req.CreateResponse(HttpStatusCode.ServiceUnavailable);
            errorResponse.Headers.Add("Content-Type", "text/plain;charset=utf-8");
            await errorResponse.WriteStringAsync("Service has failed to process the request. Please try again later.");
            return errorResponse;
        }
    }

    private async Task<string> BuildHtmlResponseAsync(string userInput, string? language, bool debug)
    {
        var templateContent = await _htmlTemplateTask.Value;
        var parts = templateContent.Split(HtmlTemplateSeparator, 2);

        var htmlHeader = parts.Length > 0 ? parts[0] : string.Empty;
        var htmlFooter = parts.Length > 1 ? parts[1] : string.Empty;

        var sb = new StringBuilder();
        sb.Append(htmlHeader);

        try
        {
            var translationInstructions = BuildTranslationInstructions(language);
            var modelOutput = await GetModelResponseAsync(userInput, translationInstructions);

            sb.Append(modelOutput);
            if (debug)
            {
                sb.AppendLine();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting model response");
            sb.Append("<api-error>Service has failed to process the request. Please try again later.</api-error>");
        }

        sb.Append(htmlFooter);
        return sb.ToString();
    }

    private static async Task<string> GetModelResponseAsync(string userInput, string translationInstructions)
    {
        var token = Environment.GetEnvironmentVariable("GITHUB_TOKEN") ?? string.Empty;
        var clientOptions = new OpenAIClientOptions
        {
            Endpoint = new Uri(Endpoint),
        };
        var client = new OpenAIClient(new ApiKeyCredential(token), clientOptions);
        var chatClient = client.GetChatClient(ModelName);

        var systemPrompt = await _systemPromptTask.Value;
        systemPrompt = systemPrompt.Replace("{0}", translationInstructions);

        var userPrompt = await _userPromptTask.Value;
        userPrompt = userPrompt.Replace("{0}", userInput);

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

        var response = await chatClient.CompleteChatAsync(messages, options);
        return response.Value.Content[0].Text;
    }

    private static string BuildTranslationInstructions(string? language) =>
        language switch
        {
            "es" => "The new versions should be translated into Spanish.",
            "fr" => "The new versions should be translated into French.",
            "de" => "The new versions should be translated into German.",
            "en" => "The new versions should be translated into English.",
            _ => "The new versions should be in the same language.",
        };

    private static async Task<string> ReadResource(string fileName)
    {
        var path = Path.Combine(ResourcesDirectory, fileName);
        return await File.ReadAllTextAsync(path, Encoding.UTF8);
    }
}
