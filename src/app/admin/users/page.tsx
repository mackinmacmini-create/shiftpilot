"use client";

import { useEffect, useState } from "react";
import { adminListUsers, adminSetAdmin } from "@/lib/actions/admin";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/types/db";
import { PLATFORM_LABELS } from "@/lib/utils";
import { Search } from "lucide-react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  async function load() {
    const { data } = await adminListUsers({ search: search || undefined });
    setUsers(data as Profile[]);
  }

  useEffect(() => { load(); }, [search]);

  async function handleToggleAdmin(userId: string, currentVal: boolean) {
    setToggling(userId);
    await adminSetAdmin(userId, !currentVal);
    await load();
    setToggling(null);
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-white">Users</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input
          placeholder="Search by display name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-2">
        {users.map((u) => (
          <Card key={u.id}>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white truncate">
                    {u.display_name ?? "Unnamed user"}
                  </p>
                  {u.is_admin && (
                    <Badge variant="warning" className="shrink-0">Admin</Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  ID: {u.id.slice(0, 12)}…
                  {u.home_city ? ` · ${u.home_city}` : ""}
                  {u.primary_platform ? ` · ${PLATFORM_LABELS[u.primary_platform] ?? u.primary_platform}` : ""}
                </p>
                <p className="text-xs text-slate-600">
                  Joined {new Date(u.created_at).toLocaleDateString()}
                </p>
              </div>
              <Button
                size="sm"
                variant={u.is_admin ? "danger" : "secondary"}
                loading={toggling === u.id}
                onClick={() => handleToggleAdmin(u.id, u.is_admin)}
              >
                {u.is_admin ? "Revoke admin" : "Make admin"}
              </Button>
            </div>
          </Card>
        ))}
        {users.length === 0 && (
          <div className="rounded-2xl border border-white/5 bg-[#13171c] py-10 text-center">
            <p className="text-sm text-slate-500">No users found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
