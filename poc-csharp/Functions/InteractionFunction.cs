using Azure.Data.Tables;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace EasyToRead.Functions;

public class InteractionFunction
{
    private readonly ILogger<InteractionFunction> _logger;

    public InteractionFunction(ILogger<InteractionFunction> logger)
    {
        _logger = logger;
    }

    [Function("interaction")]
    public async Task<IActionResult> Run(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "interaction")] HttpRequest req)
    {
        _logger.LogInformation("Http function processed request for url \"{Url}\"", req.Path);

        try
        {
            var form = await req.ReadFormAsync();
            var input = form["t"].FirstOrDefault();
            var output = form["o"].FirstOrDefault();
            var interactionId = form["i"].FirstOrDefault();
            var href = form["h"].FirstOrDefault();

            if (string.IsNullOrEmpty(input) || string.IsNullOrEmpty(output) || string.IsNullOrEmpty(interactionId))
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

            var client = new TableClient(connectionString, "Interactions");
            await client.AddEntityAsync(new TableEntity("Interactions", Guid.NewGuid().ToString())
            {
                ["InteractionId"] = interactionId,
                ["Input"] = input,
                ["Output"] = output,
                ["Href"] = href ?? string.Empty,
            });

            return new StatusCodeResult(StatusCodes.Status201Created);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process interaction request");

            return new ContentResult
            {
                StatusCode = StatusCodes.Status503ServiceUnavailable,
                Content = "Service has failed to process the request. Please try again later.",
                ContentType = "text/plain;charset=utf-8",
            };
        }
    }
}
