using Azure.Data.Tables;
using Microsoft.AspNetCore.Http;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace EasyToRead.Api.Functions;

public class CarbonFootprintFunction(TableServiceClient tableServiceClient, ILogger<CarbonFootprintFunction> logger)
{
    [Function("carbon-footprint")]
    public async Task<IResult> Run(
        [HttpTrigger(AuthorizationLevel.Function, "post")] HttpRequest req)
    {
        logger.LogInformation("Http function processed request for url \"{Url}\"",
            req.Path.Value?.ReplaceLineEndings(string.Empty));

        try
        {
            var form = await req.ReadFormAsync();
            var userInputLength = (string?)form["ul"];
            var userInputWordCount = (string?)form["uw"];
            var simplifiedOutputLength = (string?)form["sl"];
            var simplifiedOutputWordCount = (string?)form["sw"];
            var duration = (string?)form["d"];
            var interactionId = (string?)form["i"];

            if (string.IsNullOrWhiteSpace(userInputLength)
                || string.IsNullOrWhiteSpace(userInputWordCount)
                || string.IsNullOrWhiteSpace(simplifiedOutputLength)
                || string.IsNullOrWhiteSpace(simplifiedOutputWordCount)
                || string.IsNullOrWhiteSpace(duration)
                || string.IsNullOrWhiteSpace(interactionId))
            {
                return Results.BadRequest("Missing parameters.");
            }

            var tableClient = tableServiceClient.GetTableClient("CarbonFootprint");

            await tableClient.AddEntityAsync(new TableEntity("Carbon", Guid.NewGuid().ToString())
            {
                ["InteractionId"] = interactionId,
                ["UserInputLength"] = userInputLength,
                ["UserInputWordCount"] = userInputWordCount,
                ["SimplifiedOutputLength"] = simplifiedOutputLength,
                ["SimplifiedOutputWordCount"] = simplifiedOutputWordCount,
                ["Duration"] = duration,
            });

            return Results.StatusCode(StatusCodes.Status201Created);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to save carbon footprint data");
            return Results.Problem(
                detail: "Service has failed to process the request. Please try again later.",
                statusCode: StatusCodes.Status503ServiceUnavailable);
        }
    }
}
