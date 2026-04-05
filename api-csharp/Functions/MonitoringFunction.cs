using Azure.Data.Tables;
using Microsoft.AspNetCore.Http;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace EasyToRead.Api.Functions;

public class MonitoringFunction(TableServiceClient tableServiceClient, ILogger<MonitoringFunction> logger)
{
    [Function("monitoring")]
    public async Task<IResult> Run(
        [HttpTrigger(AuthorizationLevel.Function, "post")] HttpRequest req)
    {
        logger.LogInformation("Http function processed request for url \"{Url}\"", req.Path);

        try
        {
            var form = await req.ReadFormAsync();
            var duration = (string?)form["d"];
            var errorMessage = (string?)form["e"];

            if (string.IsNullOrWhiteSpace(duration))
            {
                return Results.BadRequest("Missing parameters.");
            }

            var tableClient = tableServiceClient.GetTableClient("Monitoring");

            await tableClient.AddEntityAsync(new TableEntity("Healthcheck", Guid.NewGuid().ToString())
            {
                ["Duration"] = duration,
                ["Error"] = errorMessage ?? string.Empty,
            });

            return Results.StatusCode(StatusCodes.Status201Created);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to save monitoring data");
            return Results.Problem(
                detail: "Service has failed to process the request. Please try again later.",
                statusCode: StatusCodes.Status503ServiceUnavailable);
        }
    }
}
