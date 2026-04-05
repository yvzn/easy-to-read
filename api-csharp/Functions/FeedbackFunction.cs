using Azure.Data.Tables;
using Microsoft.AspNetCore.Http;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace EasyToRead.Api.Functions;

public class FeedbackFunction(TableServiceClient tableServiceClient, ILogger<FeedbackFunction> logger)
{
    [Function("feedback")]
    public async Task<IResult> Run(
        [HttpTrigger(AuthorizationLevel.Function, "post")] HttpRequest req)
    {
        logger.LogInformation("Http function processed request for url \"{Url}\"", req.Path);

        try
        {
            var form = await req.ReadFormAsync();
            var feedbackScore = (string?)form["s"];
            var comment = (string?)form["c"];
            var interactionId = (string?)form["i"];

            if (string.IsNullOrWhiteSpace(feedbackScore) || string.IsNullOrWhiteSpace(interactionId))
            {
                return Results.BadRequest("Missing parameters.");
            }

            var tableClient = tableServiceClient.GetTableClient("Feedbacks");

            await tableClient.AddEntityAsync(new TableEntity("Feedbacks", Guid.NewGuid().ToString())
            {
                ["InteractionId"] = interactionId,
                ["Score"] = feedbackScore,
                ["Comment"] = comment ?? string.Empty,
            });

            return Results.StatusCode(StatusCodes.Status201Created);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to save feedback");
            return Results.Problem(
                detail: "Service has failed to process the request. Please try again later.",
                statusCode: StatusCodes.Status503ServiceUnavailable);
        }
    }
}
