import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Landmark, RefreshCw } from "lucide-react";
import {
  createLinkToken,
  exchangePublicToken,
  syncPlaidBalances,
} from "@/lib/plaid.functions";

export function PlaidConnect() {
  const qc = useQueryClient();
  const createToken = useServerFn(createLinkToken);
  const exchange = useServerFn(exchangePublicToken);
  const sync = useServerFn(syncPlaidBalances);

  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await createToken();
        if (!cancelled) setLinkToken(res.link_token);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [createToken]);

  const onSuccess = useCallback(
    async (public_token: string, metadata: { institution?: { name?: string } | null }) => {
      setLoading(true);
      try {
        const res = await exchange({
          data: {
            public_token,
            institution_name: metadata.institution?.name ?? undefined,
          },
        });
        toast.success(`Linked ${res.linked_accounts} account${res.linked_accounts === 1 ? "" : "s"}`);
        qc.invalidateQueries({ queryKey: ["accounts"] });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to link bank");
      } finally {
        setLoading(false);
      }
    },
    [exchange, qc],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  });

  const doSync = async () => {
    setSyncing(true);
    try {
      const res = await sync();
      toast.success(`Synced ${res.updated} account${res.updated === 1 ? "" : "s"}`);
      qc.invalidateQueries({ queryKey: ["accounts"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        onClick={() => open()}
        disabled={!ready || !linkToken || loading}
      >
        <Landmark className="h-4 w-4 mr-2" />
        {loading ? "Linking…" : "Connect bank"}
      </Button>
      <Button variant="ghost" onClick={doSync} disabled={syncing}>
        <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Syncing…" : "Sync balances"}
      </Button>
    </div>
  );
}