using Azure.Data.Tables;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Net;

namespace EasyToRead.Api.Functions;

public class Monitoring
{
    private readonly ILogger<Monitoring> _logger;

    public Monitoring(ILogger<Monitoring> logger)
    {
        _logger = logger;
    }

    [Function("monitoring")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "monitoring")] HttpRequestData req,
        FunctionContext context)
    {
        _logger.LogInformation("Http function processed request for url \"{Url}\"", req.Url);

        try
        {
            var requestBody = await req.ReadAsStringAsync() ?? string.Empty;
            var requestParams = ParseFormData(requestBody);

            var duration = requestParams.GetValueOrDefault("d");
            var errorMessage = requestParams.GetValueOrDefault("e");

            if (string.IsNullOrEmpty(duration))
            {
                var badRequest = req.CreateResponse(HttpStatusCode.BadRequest);
                badRequest.Headers.Add("Content-Type", "text/plain;charset=utf-8");
                await badRequest.WriteStringAsync("Missing parameters.");
                return badRequest;
            }

            var connectionString = Environment.GetEnvironmentVariable("INTERACTIONS_STORAGE_CONNECTION_STRING") ?? string.Empty;
            var tableClient = new TableClient(connectionString, "Monitoring");
            await tableClient.CreateIfNotExistsAsync();

            var entity = new TableEntity("Healthcheck", context.InvocationId)
            {
                ["Duration"] = duration,
                ["Error"] = errorMessage,
            };
            await tableClient.AddEntityAsync(entity);

            return req.CreateResponse(HttpStatusCode.Created);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing monitoring request");

            var errorResponse = req.CreateResponse(HttpStatusCode.ServiceUnavailable);
            errorResponse.Headers.Add("Content-Type", "text/plain;charset=utf-8");
            await errorResponse.WriteStringAsync("Service has failed to process the request. Please try again later.");
            return errorResponse;
        }
    }

    private static Dictionary<string, string> ParseFormData(string body)
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        if (string.IsNullOrEmpty(body))
            return result;

        foreach (var part in body.Split('&'))
        {
            var idx = part.IndexOf('=');
            if (idx < 0) continue;

            var key = Uri.UnescapeDataString(part[..idx].Replace('+', ' '));
            var value = Uri.UnescapeDataString(part[(idx + 1)..].Replace('+', ' '));
            result[key] = value;
        }

        return result;
    }
}
