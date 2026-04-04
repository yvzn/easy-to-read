using Azure.Data.Tables;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace EasyToRead.Functions;

public class CarbonFootprintFunction
{
    private readonly ILogger<CarbonFootprintFunction> _logger;

    public CarbonFootprintFunction(ILogger<CarbonFootprintFunction> logger)
    {
        _logger = logger;
    }

    [Function("carbon-footprint")]
    public async Task<IActionResult> Run(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "carbon-footprint")] HttpRequest req)
    {
        _logger.LogInformation("Http function processed request for url \"{Url}\"", req.Path);

        try
        {
            var form = await req.ReadFormAsync();
            var userInputLength = form["ul"].FirstOrDefault();
            var userInputWordCount = form["uw"].FirstOrDefault();
            var simplifiedOutputLength = form["sl"].FirstOrDefault();
            var simplifiedOutputWordCount = form["sw"].FirstOrDefault();
            var duration = form["d"].FirstOrDefault();
            var interactionId = form["i"].FirstOrDefault();

            if (string.IsNullOrEmpty(userInputLength)
                || string.IsNullOrEmpty(userInputWordCount)
                || string.IsNullOrEmpty(simplifiedOutputLength)
                || string.IsNullOrEmpty(simplifiedOutputWordCount)
                || string.IsNullOrEmpty(duration)
                || string.IsNullOrEmpty(interactionId))
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

            var client = new TableClient(connectionString, "CarbonFootprint");
            await client.AddEntityAsync(new TableEntity("Carbon", Guid.NewGuid().ToString())
            {
                ["InteractionId"] = interactionId,
                ["UserInputLength"] = userInputLength,
                ["UserInputWordCount"] = userInputWordCount,
                ["SimplifiedOutputLength"] = simplifiedOutputLength,
                ["SimplifiedOutputWordCount"] = simplifiedOutputWordCount,
                ["Duration"] = duration,
            });

            return new StatusCodeResult(StatusCodes.Status201Created);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process carbon-footprint request");

            return new ContentResult
            {
                StatusCode = StatusCodes.Status503ServiceUnavailable,
                Content = "Service has failed to process the request. Please try again later.",
                ContentType = "text/plain;charset=utf-8",
            };
        }
    }
}
