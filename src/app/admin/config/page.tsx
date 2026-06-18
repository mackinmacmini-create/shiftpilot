"use client";

import { useEffect, useState } from "react";
import { adminGetConfig, adminSetConfig } from "@/lib/actions/admin";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PlatformConfig } from "@/lib/types/db";
import { Settings, Save } from "lucide-react";

export default function AdminConfigPage() {
  const [configs, setConfigs] = useState<PlatformConfig[]>([]);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function load() {
    const { data } = await adminGetConfig();
    setConfigs(data as PlatformConfig[]);
    const init: Record<string, string> = {};
    for (const c of data) {
      init[c.key] = typeof c.value === "string" ? c.value : JSON.stringify(c.value);
    }
    setEditing(init);
  }

  useEffect(() => { load(); }, []);

  async function handleSave(key: string) {
    setSaving(key);
    let value: unknown = editing[key];
    try {
      value = JSON.parse(editing[key]);
    } catch {
      // keep as string
    }
    await adminSetConfig(key, value);
    setSaving(null);
    setSaved(key);
    setTimeout(() => setSaved(null), 2000);
    await load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-teal-400" />
        <h1 className="text-2xl font-bold text-white">Platform config</h1>
      </div>

      <p className="text-sm text-slate-400">
        Edit global configuration values. Values can be strings, numbers, booleans, or JSON objects.
      </p>

      <div className="space-y-3">
        {configs.map((c) => (
          <Card key={c.key}>
            <CardHeader>
              <CardTitle className="font-mono">{c.key}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label htmlFor={`config-${c.key}`}>Value (JSON or string)</Label>
                  <Input
                    id={`config-${c.key}`}
                    value={editing[c.key] ?? ""}
                    onChange={(e) =>
                      setEditing((prev) => ({ ...prev, [c.key]: e.target.value }))
                    }
                    className="font-mono text-xs"
                  />
                  {c.updated_at && (
                    <p className="mt-1 text-[10px] text-slate-600">
                      Updated {new Date(c.updated_at).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex items-end">
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={saving === c.key}
                    onClick={() => handleSave(c.key)}
                  >
                    <Save className="h-3.5 w-3.5" />
                    {saved === c.key ? "Saved!" : "Save"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {configs.length === 0 && (
          <div className="rounded-2xl border border-white/5 bg-[#13171c] py-10 text-center">
            <p className="text-sm text-slate-500">No config keys found. Run the seed migration.</p>
          </div>
        )}
      </div>
    </div>
  );
}
