# EasyRead.me

Make the words easy to understand.

Create a simple version of any text.

Make information clear and easy for everyone.

[Go to easyread.me](https://easyread.me/) to try it out.

[Continuer sur facilealire.fr](https://facilealire.fr/) pour essayer.

## How it works

EasyRead.me is a web application that consists in :

- a front-end application and website, built with <a href="https://11ty.dev">Eleventy</a>
- a back-end application, built with <a href="https://azure.microsoft.com/en-us/services/functions/">Azure Functions</a>
- a development database, built with <a href="https://github.com/Azure/Azurite">Azurite</a>

## Resources

- [European standards for making information easy to read and understand](https://www.inclusion-europe.eu/easy-to-read-standards-guidelines/)
- [Neurodiversity Design System](https://neurodiversity.design/)

## Requirements

Azure Function Core Tools

```bash
npm i -g azure-functions-core-tools@4 --unsafe-perm true
```

## Azure Monitor OpenTelemetry (POC API)

The POC API integrates the [Azure Monitor OpenTelemetry Distro](https://learn.microsoft.com/en-us/azure/azure-monitor/app/opentelemetry-enable?tabs=nodejs) to track backend API failures and report granular server response times in Azure Application Insights.

### Setup

1. Create an [Application Insights](https://learn.microsoft.com/en-us/azure/azure-monitor/app/create-workspace-resource) resource in the Azure portal.

2. Copy the **Connection String** from the Application Insights resource overview page.

3. Set the connection string as an environment variable for the POC API:

   ```bash
   APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=...;IngestionEndpoint=...
   ```

   In local development, add it to `poc/.env` (see `poc/.env.sample`).

### What is monitored

- **API failures** — failed requests and unhandled exceptions are automatically captured and visible in the Application Insights _Failures_ blade.
- **Response times** — each request duration is tracked and available in the Application Insights _Performance_ blade.

Telemetry is only enabled when `APPLICATIONINSIGHTS_CONNECTION_STRING` is set. If the variable is absent (e.g. in local development), the API starts normally without sending any telemetry.

## Licences

- [SVG Spinners](https://github.com/n3r4zzurr0/svg-spinners) - MIT (c) Utkarsh Verma
- [Remix Icon](https://www.remixicon.com/) - Apache License 2.0
