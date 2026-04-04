using Azure.Data.Tables;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Net;

namespace EasyToRead.Api.Functions;

public class Interaction
{
    private readonly ILogger<Interaction> _logger;

    public Interaction(ILogger<Interaction> logger)
    {
        _logger = logger;
    }

    [Function("interaction")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "interaction")] HttpRequestData req,
        FunctionContext context)
    {
        _logger.LogInformation("Http function processed request for url \"{Url}\"", req.Url);

        try
        {
            var requestBody = await req.ReadAsStringAsync() ?? string.Empty;
            var requestParams = FormDataParser.Parse(requestBody);

            var input = requestParams.GetValueOrDefault("t");
            var output = requestParams.GetValueOrDefault("o");
            var interactionId = requestParams.GetValueOrDefault("i");
            var href = requestParams.GetValueOrDefault("h");

            if (string.IsNullOrEmpty(input) || string.IsNullOrEmpty(output) || string.IsNullOrEmpty(interactionId))
            {
                var badRequest = req.CreateResponse(HttpStatusCode.BadRequest);
                badRequest.Headers.Add("Content-Type", "text/plain;charset=utf-8");
                await badRequest.WriteStringAsync("Missing parameters.");
                return badRequest;
            }

            var connectionString = Environment.GetEnvironmentVariable("INTERACTIONS_STORAGE_CONNECTION_STRING") ?? string.Empty;
            var tableClient = new TableClient(connectionString, "Interactions");
            await tableClient.CreateIfNotExistsAsync();

            var entity = new TableEntity("Interactions", context.InvocationId)
            {
                ["InteractionId"] = interactionId,
                ["Input"] = input,
                ["Output"] = output,
                ["Href"] = href,
            };
            await tableClient.AddEntityAsync(entity);

            return req.CreateResponse(HttpStatusCode.Created);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing interaction request");

            var errorResponse = req.CreateResponse(HttpStatusCode.ServiceUnavailable);
            errorResponse.Headers.Add("Content-Type", "text/plain;charset=utf-8");
            await errorResponse.WriteStringAsync("Service has failed to process the request. Please try again later.");
            return errorResponse;
        }
    }
}
