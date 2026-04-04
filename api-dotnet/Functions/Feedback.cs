using Azure.Data.Tables;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Net;

namespace EasyToRead.Api.Functions;

public class Feedback
{
    private readonly ILogger<Feedback> _logger;

    public Feedback(ILogger<Feedback> logger)
    {
        _logger = logger;
    }

    [Function("feedback")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "feedback")] HttpRequestData req,
        FunctionContext context)
    {
        _logger.LogInformation("Http function processed request for url \"{Url}\"", req.Url);

        try
        {
            var requestBody = await req.ReadAsStringAsync() ?? string.Empty;
            var requestParams = FormDataParser.Parse(requestBody);

            var feedbackScore = requestParams.GetValueOrDefault("s");
            var comment = requestParams.GetValueOrDefault("c");
            var interactionId = requestParams.GetValueOrDefault("i");

            if (string.IsNullOrEmpty(feedbackScore) || string.IsNullOrEmpty(interactionId))
            {
                var badRequest = req.CreateResponse(HttpStatusCode.BadRequest);
                badRequest.Headers.Add("Content-Type", "text/plain;charset=utf-8");
                await badRequest.WriteStringAsync("Missing parameters.");
                return badRequest;
            }

            var connectionString = Environment.GetEnvironmentVariable("INTERACTIONS_STORAGE_CONNECTION_STRING") ?? string.Empty;
            var tableClient = new TableClient(connectionString, "Feedbacks");
            await tableClient.CreateIfNotExistsAsync();

            var entity = new TableEntity("Feedbacks", context.InvocationId)
            {
                ["InteractionId"] = interactionId,
                ["Score"] = feedbackScore,
                ["Comment"] = comment,
            };
            await tableClient.AddEntityAsync(entity);

            return req.CreateResponse(HttpStatusCode.Created);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing feedback request");

            var errorResponse = req.CreateResponse(HttpStatusCode.ServiceUnavailable);
            errorResponse.Headers.Add("Content-Type", "text/plain;charset=utf-8");
            await errorResponse.WriteStringAsync("Service has failed to process the request. Please try again later.");
            return errorResponse;
        }
    }
}
