using Azure.Data.Tables;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace EasyToRead.Functions;

public class MonitoringFunction
{
    private readonly ILogger<MonitoringFunction> _logger;

    public MonitoringFunction(ILogger<MonitoringFunction> logger)
    {
        _logger = logger;
    }

    [Function("monitoring")]
    public async Task<IActionResult> Run(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "monitoring")] HttpRequest req)
    {
        _logger.LogInformation("Http function processed request for url \"{Url}\"", req.Path);

        try
        {
            var form = await req.ReadFormAsync();
            var duration = form["d"].FirstOrDefault();
            var errorMessage = form["e"].FirstOrDefault();

            if (string.IsNullOrEmpty(duration))
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

            var client = new TableClient(connectionString, "Monitoring");
            await client.AddEntityAsync(new TableEntity("Healthcheck", Guid.NewGuid().ToString())
            {
                ["Duration"] = duration,
                ["Error"] = errorMessage,
            });

            return new StatusCodeResult(StatusCodes.Status201Created);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process monitoring request");

            return new ContentResult
            {
                StatusCode = StatusCodes.Status503ServiceUnavailable,
                Content = "Service has failed to process the request. Please try again later.",
                ContentType = "text/plain;charset=utf-8",
            };
        }
    }
}
