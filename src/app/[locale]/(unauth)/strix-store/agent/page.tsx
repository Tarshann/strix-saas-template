import { unstable_setRequestLocale } from 'next-intl/server';

import { AgentConsole } from '@/features/strix-store/components/AgentConsole';

export default function AgentConsolePage(props: { params: { locale: string } }) {
  unstable_setRequestLocale(props.params.locale);
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-white">Agent Console</h1>
        <p className="mt-1 max-w-2xl text-white/60">
          An autonomous agent is wired into this store. Pick a scenario — the agent plans, reasons, and then fires a high-risk tool call. Strix evaluates every call against policy and emits a proof receipt.
        </p>
      </header>
      <AgentConsole />
    </div>
  );
}
