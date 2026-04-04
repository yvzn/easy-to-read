using Azure.Data.Tables;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Net;

namespace EasyToRead.Api.Functions;

public class CarbonFootprint
{
    private readonly ILogger<CarbonFootprint> _logger;

    public CarbonFootprint(ILogger<CarbonFootprint> logger)
    {
        _logger = logger;
    }

    [Function("carbon-footprint")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "carbon-footprint")] HttpRequestData req,
        FunctionContext context)
    {
        _logger.LogInformation("Http function processed request for url \"{Url}\"", req.Url);

        try
        {
            var requestBody = await req.ReadAsStringAsync() ?? string.Empty;
            var requestParams = FormDataParser.Parse(requestBody);

            var userInputLength = requestParams.GetValueOrDefault("ul");
            var userInputWordCount = requestParams.GetValueOrDefault("uw");
            var simplifiedOutputLength = requestParams.GetValueOrDefault("sl");
            var simplifiedOutputWordCount = requestParams.GetValueOrDefault("sw");
            var duration = requestParams.GetValueOrDefault("d");
            var interactionId = requestParams.GetValueOrDefault("i");

            if (new[] { userInputLength, userInputWordCount, simplifiedOutputLength, simplifiedOutputWordCount, duration, interactionId }
                .Any(string.IsNullOrEmpty))
            {
                var badRequest = req.CreateResponse(HttpStatusCode.BadRequest);
                badRequest.Headers.Add("Content-Type", "text/plain;charset=utf-8");
                await badRequest.WriteStringAsync("Missing parameters.");
                return badRequest;
            }

            var connectionString = Environment.GetEnvironmentVariable("INTERACTIONS_STORAGE_CONNECTION_STRING") ?? string.Empty;
            var tableClient = new TableClient(connectionString, "CarbonFootprint");
            await tableClient.CreateIfNotExistsAsync();

            var entity = new TableEntity("Carbon", context.InvocationId)
            {
                ["InteractionId"] = interactionId,
                ["UserInputLength"] = userInputLength,
                ["UserInputWordCount"] = userInputWordCount,
                ["SimplifiedOutputLength"] = simplifiedOutputLength,
                ["SimplifiedOutputWordCount"] = simplifiedOutputWordCount,
                ["Duration"] = duration,
            };
            await tableClient.AddEntityAsync(entity);

            return req.CreateResponse(HttpStatusCode.Created);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing carbon-footprint request");

            var errorResponse = req.CreateResponse(HttpStatusCode.ServiceUnavailable);
            errorResponse.Headers.Add("Content-Type", "text/plain;charset=utf-8");
            await errorResponse.WriteStringAsync("Service has failed to process the request. Please try again later.");
            return errorResponse;
        }
    }
}
