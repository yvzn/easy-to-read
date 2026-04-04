using Azure.Data.Tables;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace EasyToRead.Functions;

public class FeedbackFunction
{
    private readonly ILogger<FeedbackFunction> _logger;

    public FeedbackFunction(ILogger<FeedbackFunction> logger)
    {
        _logger = logger;
    }

    [Function("feedback")]
    public async Task<IActionResult> Run(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "feedback")] HttpRequest req)
    {
        var path = req.Path.Value?.Replace("\r", "").Replace("\n", "") ?? string.Empty;
        _logger.LogInformation("Http function processed request for url \"{Url}\"", path);

        try
        {
            var form = await req.ReadFormAsync();
            var score = form["s"].FirstOrDefault();
            var comment = form["c"].FirstOrDefault();
            var interactionId = form["i"].FirstOrDefault();

            if (string.IsNullOrEmpty(score) || string.IsNullOrEmpty(interactionId))
            {
                return new ContentResult
                {
                    StatusCode = StatusCodes.Status400BadRequest,
                    Content = "Missing parameters.",
                    ContentType = "text/plain;charset=utf-8",
                };
            }

            var connectionString = Environment.GetEnvironmentVariable("INTERACTIONS_STORAGE_CONNECTION_STRING");
            if (string.IsNullOrEmpty(connectionString))
            {
                throw new InvalidOperationException("Missing storage connection string.");
            }

            var client = new TableClient(connectionString, "Feedbacks");
            await client.AddEntityAsync(new TableEntity("Feedbacks", Guid.NewGuid().ToString())
            {
                ["InteractionId"] = interactionId,
                ["Score"] = score,
                ["Comment"] = comment ?? string.Empty,
            });

            return new StatusCodeResult(StatusCodes.Status201Created);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process feedback request");

            return new ContentResult
            {
                StatusCode = StatusCodes.Status503ServiceUnavailable,
                Content = "Service has failed to process the request. Please try again later.",
                ContentType = "text/plain;charset=utf-8",
            };
        }
    }
}
