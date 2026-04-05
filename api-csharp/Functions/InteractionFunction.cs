using Azure.Data.Tables;
using Microsoft.AspNetCore.Http;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace EasyToRead.Api.Functions;

public class InteractionFunction(TableServiceClient tableServiceClient, ILogger<InteractionFunction> logger)
{
    [Function("interaction")]
    public async Task<IResult> Run(
        [HttpTrigger(AuthorizationLevel.Function, "post")] HttpRequest req)
    {
        logger.LogInformation("Http function processed request for url \"{Url}\"", req.Path);

        try
        {
            var form = await req.ReadFormAsync();
            var input = (string?)form["t"];
            var output = (string?)form["o"];
            var interactionId = (string?)form["i"];
            var href = (string?)form["h"];

            if (string.IsNullOrWhiteSpace(input)
                || string.IsNullOrWhiteSpace(output)
                || string.IsNullOrWhiteSpace(interactionId))
            {
                return Results.BadRequest("Missing parameters.");
            }

            var tableClient = tableServiceClient.GetTableClient("Interactions");

            await tableClient.AddEntityAsync(new TableEntity("Interactions", Guid.NewGuid().ToString())
            {
                ["InteractionId"] = interactionId,
                ["Input"] = input,
                ["Output"] = output,
                ["Href"] = href ?? string.Empty,
            });

            return Results.StatusCode(StatusCodes.Status201Created);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to save interaction");
            return Results.Problem(
                detail: "Service has failed to process the request. Please try again later.",
                statusCode: StatusCodes.Status503ServiceUnavailable);
        }
    }
}
