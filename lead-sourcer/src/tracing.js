import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

let sdk;
let tracingInitialized = false;

function envFlag(name, defaultValue = true) {
    const raw = String(process.env[name] || '').trim().toLowerCase();
    if (!raw) return defaultValue;
    return !['0', 'false', 'no', 'off'].includes(raw);
}

function resolveOtlpTracesEndpoint() {
    const explicitTraces = String(process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || '').trim();
    if (explicitTraces) return explicitTraces;

    const genericEndpoint = String(process.env.OTEL_EXPORTER_OTLP_ENDPOINT || '').trim();
    if (!genericEndpoint) return 'http://localhost:4318/v1/traces';

    return genericEndpoint.endsWith('/')
        ? `${genericEndpoint}v1/traces`
        : `${genericEndpoint}/v1/traces`;
}

export async function initializeTracing() {
    if (tracingInitialized) return;

    const enabled = envFlag('LEAD_SOURCER_TRACING_ENABLED', true);
    if (!enabled) return;

    const endpoint = resolveOtlpTracesEndpoint();
    process.env.OTEL_SERVICE_NAME = process.env.OTEL_SERVICE_NAME
        || process.env.LEAD_SOURCER_OTEL_SERVICE_NAME
        || 'lead-sourcer';

    sdk = new NodeSDK({
        traceExporter: new OTLPTraceExporter({
            url: endpoint,
        }),
        instrumentations: [
            getNodeAutoInstrumentations({
                '@opentelemetry/instrumentation-fs': {
                    enabled: false,
                },
            }),
        ],
    });

    await sdk.start();
    tracingInitialized = true;
    console.log(`[tracing] OpenTelemetry enabled (service=${process.env.OTEL_SERVICE_NAME}, endpoint=${endpoint})`);

    const shutdown = async (signal) => {
        try {
            if (sdk) {
                await sdk.shutdown();
            }
        } catch (error) {
            console.warn(`[tracing] Shutdown error (${signal}):`, error?.message || error);
        }
    };

    process.once('SIGINT', () => {
        shutdown('SIGINT').finally(() => process.exit(0));
    });
    process.once('SIGTERM', () => {
        shutdown('SIGTERM').finally(() => process.exit(0));
    });
    process.once('beforeExit', () => {
        shutdown('beforeExit').catch(() => { });
    });
}
