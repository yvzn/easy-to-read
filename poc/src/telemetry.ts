import { useAzureMonitor } from "@azure/monitor-opentelemetry";

const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

if (connectionString) {
	useAzureMonitor({
		azureMonitorExporterOptions: {
			connectionString,
		},
	});
	console.log("Azure Monitor OpenTelemetry enabled.");
} else {
	console.log("Azure Monitor OpenTelemetry disabled (APPLICATIONINSIGHTS_CONNECTION_STRING not set).");
}
