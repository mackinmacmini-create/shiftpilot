import { adminGetStats } from "@/lib/actions/admin";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, ClipboardList, Bell, Activity } from "lucide-react";

export default async function AdminDashboardPage() {
  const stats = await adminGetStats();

  if (!stats) {
    return (
      <div className="text-center py-20 text-slate-500">
        <p>Failed to load admin stats. Check your permissions.</p>
      </div>
    );
  }

  const statCards = [
    { label: "Total users", value: stats.totalUsers, icon: Users },
    { label: "Opportunities logged (7d)", value: stats.recentOps, icon: ClipboardList },
    { label: "Notifications sent (7d)", value: stats.recentNotifs, icon: Bell },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Admin overview</h1>

      <div className="grid grid-cols-3 gap-4">
        {statCards.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <div className="flex items-center gap-3 mb-2">
              <Icon className="h-4 w-4 text-teal-400" />
              <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
            </div>
            <p className="text-3xl font-bold text-white">{value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-teal-400" />
            <CardTitle>Recent audit events</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {stats.recentAudit.length === 0 ? (
            <p className="text-sm text-slate-500">No recent audit events.</p>
          ) : (
            <div className="space-y-2">
              {stats.recentAudit.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2"
                >
                  <div>
                    <p className="text-sm text-white">
                      <span className="text-teal-400">{log.action}</span>{" "}
                      <span className="text-slate-400">{log.entity_type}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {log.actor_user_id
                        ? `User ${log.actor_user_id.slice(0, 8)}…`
                        : "System"}
                    </p>
                  </div>
                  <p className="text-xs text-slate-600">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
