"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { AccessibleRepo } from "@/lib/github";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SettingsData = { repos: string[] };
type ReposData = { repos: AccessibleRepo[] };

async function putSettings(body: { repos: string[] }) {
  const res = await fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to save settings");
  return data as SettingsData;
}

function ReposCard({
  settings,
  onSaved,
}: {
  settings: SettingsData | undefined;
  onSaved: () => void;
}) {
  const { data, error, isLoading } = useSWR<ReposData>("/api/repos", fetcher, {
    revalidateOnFocus: false,
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [manual, setManual] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null
  );

  // Initialize selection from saved settings once they load
  useEffect(() => {
    if (settings) setSelected(new Set(settings.repos));
  }, [settings]);

  const visible = useMemo(() => {
    const accessible = data?.repos ?? [];
    const known = new Set(accessible.map((r) => r.fullName));
    // Keep previously-selected repos visible even if not in the accessible list
    const extras: AccessibleRepo[] = [...selected]
      .filter((name) => !known.has(name))
      .map((name) => ({
        fullName: name,
        private: false,
        description: null,
        pushedAt: null,
      }));
    const all = [...extras, ...accessible];
    const q = search.trim().toLowerCase();
    const filtered = q
      ? all.filter((r) => r.fullName.toLowerCase().includes(q))
      : all;
    // Selected first, then GitHub's recently-pushed order
    return [...filtered].sort(
      (a, b) =>
        Number(selected.has(b.fullName)) - Number(selected.has(a.fullName))
    );
  }, [data, search, selected]);

  function toggle(fullName: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(fullName)) next.delete(fullName);
      else next.add(fullName);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      await putSettings({ repos: [...selected] });
      setMessage({ ok: true, text: "Repositories saved." });
      onSaved();
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  function addManual() {
    const name = manual.trim().replace(/^https?:\/\/github\.com\//, "");
    if (!/^[\w.-]+\/[\w.-]+$/.test(name)) {
      setMessage({
        ok: false,
        text: 'Enter the repo as "owner/repo", e.g. burningbrosdabi/pitb-be',
      });
      return;
    }
    setMessage(null);
    setSelected((prev) => new Set(prev).add(name));
    setManual("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          Repositories to monitor
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            {selected.size} selected
          </span>
        </CardTitle>
        <CardDescription>
          Pick the repositories whose deployments and pull requests you want on
          the dashboard. The list shows repos your token can access.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search repositories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save repositories"}
          </Button>
        </div>
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addManual();
          }}
        >
          <Input
            placeholder="Add manually: owner/repo"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            className="flex-1 font-mono"
          />
          <Button type="submit" variant="outline" disabled={!manual.trim()}>
            Add
          </Button>
        </form>
        {message && (
          <p
            className={
              message.ok
                ? "text-sm text-emerald-600"
                : "rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            }
          >
            {message.text}
          </p>
        )}
        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Failed to list repositories from GitHub.
          </p>
        )}
        {isLoading &&
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        <div className="flex max-h-112 flex-col gap-0.5 overflow-y-auto">
          {visible.map((repo) => (
            <label
              key={repo.fullName}
              className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-accent/60"
            >
              <Checkbox
                checked={selected.has(repo.fullName)}
                onCheckedChange={() => toggle(repo.fullName)}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-sm">
                  {repo.fullName}
                </span>
                {repo.description && (
                  <span className="block truncate text-xs text-muted-foreground">
                    {repo.description}
                  </span>
                )}
              </span>
              {repo.private && (
                <Badge variant="outline" className="shrink-0 text-xs">
                  private
                </Badge>
              )}
            </label>
          ))}
          {!isLoading && visible.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No repositories match your search.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function SettingsView() {
  const router = useRouter();
  const { data: settings, mutate } = useSWR<SettingsData>(
    "/api/settings",
    fetcher,
    { revalidateOnFocus: false }
  );

  function onSaved() {
    mutate();
    router.refresh(); // sidebar repo list is server-rendered from the cookie
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-20 -mx-4 -mt-4 flex min-h-14 shrink-0 items-center border-b bg-background/90 px-4 py-2 backdrop-blur md:-mx-6 md:-mt-6 md:h-14 md:px-6 md:py-0">
        <h1 className="text-lg font-semibold">Settings</h1>
      </div>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <ReposCard settings={settings} onSaved={onSaved} />
      </div>
    </div>
  );
}
