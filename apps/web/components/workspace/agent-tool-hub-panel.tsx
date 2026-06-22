"use client";

import { useMemo, useState } from "react";
import {
  checkProviderHealth,
  defaultAgentToolMappings,
  getMockUsageLogs,
  getRuntimeImageGenerationStats,
  getRuntimePublishingStats,
  getProvidersByCategory,
  getRuntimeProviderStats,
  getRuntimeVideoGenerationStats,
  getRuntimeVoiceGenerationStats,
  routeToolCall,
  toolProviders,
  type AgentToolMapping,
  type ToolCategory,
  type ToolProviderId,
  type ToolStatus,
} from "@/lib/tools";

type AgentToolHubPanelProps = {
  onNotify: (title: string, tone: "success" | "error" | "info", description?: string) => void;
};

const categories: Array<{ key: ToolCategory; label: string }> = [
  { key: "research", label: "Research" },
  { key: "text_generation", label: "Text" },
  { key: "image_generation", label: "Image" },
  { key: "voice_generation", label: "Voice" },
  { key: "video_generation", label: "Video" },
  { key: "publishing", label: "Publishing" },
  { key: "analytics", label: "Analytics" },
];

const statusClass: Record<ToolStatus, string> = {
  connected: "border-[#34D399]/25 bg-[#34D399]/10 text-[#6EE7B7]",
  disconnected: "border-white/15 bg-white/[0.05] text-mist",
  missing_credentials: "border-[#FBBF24]/25 bg-[#FBBF24]/10 text-[#FDE68A]",
  rate_limited: "border-violetGlow/25 bg-violetGlow/10 text-violetGlow",
  quota_warning: "border-[#F59E0B]/25 bg-[#F59E0B]/10 text-[#FCD34D]",
  failed: "border-[#FB7185]/25 bg-[#FB7185]/10 text-[#FDA4AF]",
};

function providerName(providerId: ToolProviderId) {
  return toolProviders.find((provider) => provider.id === providerId)?.name ?? providerId;
}

function safeProviderStatus(status: ToolStatus) {
  return status === "connected" || status === "quota_warning" ? "connected" : "disconnected";
}

export function AgentToolHubPanel({ onNotify }: AgentToolHubPanelProps) {
  const [mappings, setMappings] = useState<AgentToolMapping[]>(defaultAgentToolMappings);
  const [logs, setLogs] = useState(() => getMockUsageLogs());
  const [healthRefreshCount, setHealthRefreshCount] = useState(0);

  const matrix = useMemo(
    () => {
      const refreshVersion = healthRefreshCount;
      return mappings.map((mapping) => {
        const primary = checkProviderHealth(mapping.primaryProvider);
        const fallback = checkProviderHealth(mapping.fallbackProvider);
        const runtimeStats = getRuntimeProviderStats(mapping.primaryProvider);
        const usageToday = logs.filter((log) => log.agent === mapping.agentType).reduce((sum, log) => sum + log.credits, 0) + runtimeStats.creditUsage;
        const lastUsed = runtimeStats.lastSuccessAt ?? logs.find((log) => log.agent === mapping.agentType)?.timestamp;
        const tokenUsage = logs.filter((log) => log.agent === mapping.agentType).reduce((sum, log) => sum + log.tokens, 0) + runtimeStats.tokenUsage;
        return { mapping, primary, fallback, usageToday, lastUsed, tokenUsage, refreshVersion };
      });
    },
    [logs, mappings, healthRefreshCount],
  );

  function updateMapping(agentType: AgentToolMapping["agentType"], field: "primaryProvider" | "fallbackProvider", value: ToolProviderId) {
    setMappings((current) =>
      current.map((mapping) => (mapping.agentType === agentType ? { ...mapping, [field]: value } : mapping)),
    );
  }

  function testProvider(providerId: ToolProviderId) {
    const mapping = mappings.find((item) => item.primaryProvider === providerId || item.fallbackProvider === providerId);
    const result = routeToolCall({
      agentType: mapping?.agentType ?? "research",
      taskType: "provider_health_test",
      preferredProvider: providerId,
      payload: { source: "agent_tool_hub" },
    });
    setLogs((current) => [
      {
        id: `tool-test-${providerId}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        agent: mapping?.agentType ?? "research",
        provider: result.provider,
        action: "provider_health_test",
        status: result.status,
        tokens: result.usage.tokens,
        credits: result.usage.credits,
        latencyMs: result.usage.latencyMs,
      },
      ...current,
    ].slice(0, 16));
    onNotify("Provider tested", result.success ? "success" : "info", `${providerName(result.provider)} returned ${result.status}.`);
  }

  function resetDefaults() {
    setMappings(defaultAgentToolMappings);
    onNotify("Tool mapping reset", "info", "Default provider routing has been restored.");
  }

  function saveMapping() {
    onNotify("Tool mapping saved", "success", "Mappings are stored locally and ready for Supabase persistence.");
  }

  return (
    <section className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-white/10 bg-ink/45 p-3.5 sm:mt-4 sm:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Agent Tool Hub</p>
          <h3 className="mt-2 text-xl font-semibold text-frost">Provider-ready tool calling layer</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-mist">
            Route every agent through health-checked providers with fallbacks, usage logging, and credential-safe status monitoring.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => setHealthRefreshCount((count) => count + 1)} className="inline-flex min-h-11 items-center justify-center rounded-full border border-cyberBlue/30 bg-cyberBlue/10 px-5 text-sm font-medium text-cyberBlue transition hover:border-cyberBlue/50 hover:text-frost">
            Refresh Health
          </button>
          <button type="button" onClick={saveMapping} className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm font-medium text-mist transition hover:border-violetGlow/35 hover:text-frost">
            Save Mapping
          </button>
          <button type="button" onClick={resetDefaults} className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm font-medium text-mist transition hover:border-white/20 hover:text-frost">
            Reset Defaults
          </button>
        </div>
      </div>

      <div className="mt-5 rounded-3xl border border-cyberBlue/15 bg-cyberBlue/[0.04] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Tool Provider Matrix</p>
        <div className="mt-4 grid gap-3">
          {matrix.map(({ mapping, primary, fallback, usageToday, lastUsed, tokenUsage }) => (
            <article key={mapping.agentType} className="grid gap-3 rounded-2xl border border-white/10 bg-ink/35 p-3 lg:grid-cols-[0.85fr_1fr_1fr_0.8fr_0.6fr_0.8fr] lg:items-center">
              <MatrixCell label="Agent" value={mapping.agentType} />
              <MatrixCell label="Primary Tool" value={providerName(mapping.primaryProvider)} />
              <MatrixCell label="Fallback Tool" value={providerName(mapping.fallbackProvider)} />
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-mist">Status</p>
                <span className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-[10px] ${statusClass[primary.status]}`}>{safeProviderStatus(primary.status)}</span>
              </div>
              <MatrixCell label="Usage Today" value={`${usageToday} credits`} />
              <MatrixCell label="Last Success" value={lastUsed ? new Date(lastUsed).toLocaleTimeString() : "Never"} />
              <p className="hidden text-xs text-mist lg:col-span-6">Fallback health: {fallback.health} / Token usage: {tokenUsage}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.85fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Provider Cards</p>
          <div className="mt-4 space-y-5">
            {categories.map((category) => (
              <div key={category.key}>
                <p className="mb-3 text-sm font-semibold text-frost">{category.label}</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {getProvidersByCategory(category.key).map((provider) => {
                    const health = checkProviderHealth(provider.id);
                    const stats = getRuntimeProviderStats(provider.id);
                    const imageStats = category.key === "image_generation" ? getRuntimeImageGenerationStats(provider.id) : null;
                    const voiceStats = category.key === "voice_generation" ? getRuntimeVoiceGenerationStats(provider.id) : null;
                    const videoStats = category.key === "video_generation" ? getRuntimeVideoGenerationStats(provider.id) : null;
                    const publishingStats = category.key === "publishing" ? getRuntimePublishingStats(provider.id) : null;
                    return (
                      <article key={provider.id} className="min-w-0 rounded-2xl border border-white/10 bg-ink/35 p-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-frost">{provider.name}</p>
                            <p className="mt-1 text-xs text-mist">{category.label} provider</p>
                          </div>
                          <span className={`rounded-full border px-2.5 py-1 text-[10px] ${statusClass[health.status]}`}>{safeProviderStatus(health.status)}</span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-mist">
                          <Metric label="Quota" value={`${provider.quotaUsed}/${provider.quotaLimit}`} />
                          <Metric label="Latency" value={`${health.latencyMs}ms`} />
                          <Metric label="Health" value={health.health} />
                          <Metric label="Last Success" value={stats.lastSuccessAt ? new Date(stats.lastSuccessAt).toLocaleTimeString() : "Never"} />
                          <Metric label="Tokens" value={String(stats.tokenUsage)} />
                          {imageStats ? <Metric label="Images" value={String(imageStats.generatedImageCount)} /> : null}
                          {imageStats ? <Metric label="Last Image" value={imageStats.lastImageSuccessAt ? new Date(imageStats.lastImageSuccessAt).toLocaleTimeString() : "Never"} /> : null}
                          {voiceStats ? <Metric label="Audio" value={String(voiceStats.generatedAudioCount)} /> : null}
                          {voiceStats ? <Metric label="Last Audio" value={voiceStats.lastAudioAt ? new Date(voiceStats.lastAudioAt).toLocaleTimeString() : "Never"} /> : null}
                          {voiceStats ? <Metric label="Last Voice" value={voiceStats.lastAudioProvider ? providerName(voiceStats.lastAudioProvider) : "Never"} /> : null}
                          {videoStats ? <Metric label="Videos" value={String(videoStats.generatedVideoCount)} /> : null}
                          {videoStats ? <Metric label="Last Render" value={videoStats.lastRenderedVideoAt ? new Date(videoStats.lastRenderedVideoAt).toLocaleTimeString() : "Never"} /> : null}
                          {videoStats ? <Metric label="Last Video" value={videoStats.lastVideoProvider ? providerName(videoStats.lastVideoProvider) : "Never"} /> : null}
                          {publishingStats ? <Metric label="Accounts" value={String(publishingStats.connectedAccounts)} /> : null}
                          {publishingStats ? <Metric label="Published" value={String(publishingStats.publishCount)} /> : null}
                          {publishingStats ? <Metric label="Failed" value={String(publishingStats.failedPublishCount)} /> : null}
                          {publishingStats ? <Metric label="Scheduled" value={String(publishingStats.scheduledQueue)} /> : null}
                          {publishingStats ? <Metric label="Last Publish" value={publishingStats.lastPublishedAt ? new Date(publishingStats.lastPublishedAt).toLocaleTimeString() : "Never"} /> : null}
                        </div>
                        <button type="button" onClick={() => testProvider(provider.id)} className="mt-3 inline-flex min-h-9 w-full items-center justify-center rounded-full border border-cyberBlue/20 bg-cyberBlue/10 px-4 text-xs font-medium text-cyberBlue transition hover:border-cyberBlue/45 hover:text-frost">
                          {provider.requiredEnv.length ? "Configure / Test" : "Test Provider"}
                        </button>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Agent Tool Mapping</p>
            <div className="mt-4 space-y-3">
              {mappings.map((mapping) => {
                const providers = getProvidersByCategory(mapping.category);
                return (
                  <div key={`mapping-${mapping.agentType}`} className="rounded-2xl border border-white/10 bg-ink/35 p-3">
                    <p className="text-sm font-semibold capitalize text-frost">{mapping.agentType}</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <DarkSelect
                        label="Primary"
                        value={mapping.primaryProvider}
                        options={providers.map((provider) => provider.id)}
                        onChange={(value) => updateMapping(mapping.agentType, "primaryProvider", value)}
                      />
                      <DarkSelect
                        label="Fallback"
                        value={mapping.fallbackProvider}
                        options={providers.map((provider) => provider.id)}
                        onChange={(value) => updateMapping(mapping.agentType, "fallbackProvider", value)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Provider Health Monitor</p>
            <div className="mt-4 space-y-2">
              {toolProviders.slice(0, 10).map((provider) => {
                const health = checkProviderHealth(provider.id);
                return (
                  <div key={`health-${provider.id}`} className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-ink/35 p-3">
                    <p className="min-w-0 truncate text-sm text-frost">{provider.name}</p>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] ${statusClass[health.status]}`}>{health.health}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.035] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Tool Usage Logs</p>
        <div className="mt-4 grid gap-2 lg:grid-cols-2">
          {logs.map((log) => (
            <div key={log.id} className="min-w-0 rounded-2xl border border-white/10 bg-ink/35 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-frost">{providerName(log.provider)}</p>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] ${statusClass[log.status]}`}>{log.status}</span>
              </div>
              <p className="mt-1 text-xs capitalize text-mist">{log.agent} / {log.action} / {new Date(log.timestamp).toLocaleTimeString()}</p>
              <p className="mt-2 text-xs text-mist">{log.tokens} tokens / {log.credits} credits / {log.latencyMs}ms</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MatrixCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-[0.16em] text-mist">{label}</p>
      <p className="mt-1 truncate text-sm font-medium capitalize text-frost" title={value}>{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.035] px-2 py-1.5">
      <p className="truncate text-[10px] uppercase tracking-[0.12em] text-mist">{label}</p>
      <p className="mt-0.5 truncate text-xs font-medium text-frost" title={value}>{value}</p>
    </div>
  );
}

function DarkSelect({ label, value, options, onChange }: { label: string; value: ToolProviderId; options: ToolProviderId[]; onChange: (value: ToolProviderId) => void }) {
  return (
    <label className="min-w-0 text-xs text-mist">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as ToolProviderId)}
        className="mt-1 min-h-10 w-full min-w-0 rounded-2xl border border-white/10 bg-ink/80 px-3 text-sm text-frost outline-none transition focus:border-cyberBlue/40"
      >
        {options.map((option) => (
          <option key={`${label}-${option}`} value={option}>
            {providerName(option)}
          </option>
        ))}
      </select>
    </label>
  );
}
