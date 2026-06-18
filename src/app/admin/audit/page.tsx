"use client";

import { useEffect, useState } from "react";
import { adminListAuditLogs } from "@/lib/actions/admin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { AuditLog } from "@/lib/types/db";

const ENTITY_TYPES = [
  "profile",
  "availability_window",
  "desired_block",
  "opportunity_log",
  "earnings_entry",
  "driver_station_preference",
  "notification_preferences",
  "platform_config",
];

const PAGE_SIZE = 50;

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [entityType, setEntityType] = useState("");

  async function load(p = 0) {
    const { data, count: c } = await adminListAuditLogs({
      limit: PAGE_SIZE,
      offset: p * PAGE_SIZE,
      entity_type: entityType || undefined,
    });
    setLogs(data as AuditLog[]);
    setCount(c);
    setPage(p);
  }

  useEffect(() => { load(0); }, [entityType]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-white">Audit log</h1>

      <div className="flex gap-3">
        <Select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="w-56"
        >
          <option value="">All entity types</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </Select>
        <span className="flex items-center text-xs text-slate-500">{count} total records</span>
      </div>

      <div className="space-y-2">
        {logs.map((log) => (
          <Card key={log.id} className="py-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="rounded-md bg-teal-400/10 px-2 py-0.5 text-xs font-mono text-teal-400">
                    {log.action}
                  </span>
                  <span className="text-xs text-slate-400">{log.entity_type}</span>
                  {log.entity_id && (
                    <span className="text-xs text-slate-600 font-mono">
                      {log.entity_id.slice(0, 8)}…
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {log.actor_user_id
                    ? `User: ${log.actor_user_id.slice(0, 12)}…`
                    : "System"}
                  {log.ip ? ` · IP: ${log.ip}` : ""}
                </p>
                {Object.keys(log.metadata ?? {}).length > 0 && (
                  <p className="mt-0.5 text-[10px] text-slate-600 font-mono truncate">
                    {JSON.stringify(log.metadata)}
                  </p>
                )}
              </div>
              <p className="text-xs text-slate-600 shrink-0">
                {new Date(log.created_at).toLocaleString()}
              </p>
            </div>
          </Card>
        ))}

        {logs.length === 0 && (
          <div className="rounded-2xl border border-white/5 bg-[#13171c] py-10 text-center">
            <p className="text-sm text-slate-500">No audit logs found.</p>
          </div>
        )}
      </div>

      {count > PAGE_SIZE && (
        <div className="flex justify-center gap-3">
          <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => load(page - 1)}>
            Previous
          </Button>
          <span className="flex items-center text-xs text-slate-500">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, count)} of {count}
          </span>
          <Button
            size="sm"
            variant="secondary"
            disabled={(page + 1) * PAGE_SIZE >= count}
            onClick={() => load(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
