using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace EasyToRead.Api.Functions;

public class HealthFunction
{
    [Function("health")]
    public IActionResult Run([HttpTrigger(AuthorizationLevel.Anonymous, "get")] HttpRequest req)
    {
        return new OkObjectResult("Healthy");
    }
}
