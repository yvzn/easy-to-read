using EasyToRead.Api;
using Microsoft.Azure.Functions.Worker.Builder;
using Microsoft.Extensions.Azure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using OpenAI;
using System.ClientModel;

var builder = FunctionsApplication.CreateBuilder(args);

builder.ConfigureFunctionsWebApplication();

builder.Services.AddAzureClients(clients =>
{
    var connectionString = builder.Configuration["INTERACTIONS_STORAGE_CONNECTION_STRING"]
        ?? "UseDevelopmentStorage=true";
    clients.AddTableServiceClient(connectionString);
});

builder.Services.AddSingleton(sp =>
{
    var token = builder.Configuration["GITHUB_TOKEN"] ?? string.Empty;
    var endpoint = new Uri(AiSettings.Endpoint);
    return new OpenAIClient(new ApiKeyCredential(token), new OpenAIClientOptions { Endpoint = endpoint });
});

builder.Build().Run();
