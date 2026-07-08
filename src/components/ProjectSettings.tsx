"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge } from "@/components/ui";

interface ProjectData {
  id: string;
  name: string;
  domain: string;
  gscSiteUrl: string | null;
  ga4PropertyId: string | null;
  scanFrequency: string;
  emailAlerts: boolean;
}

interface Member {
  id: string;
  role: string;
  name: string | null;
  email: string;
  isSelf: boolean;
}

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

export default function ProjectSettings({
  project,
  members,
  role,
  googleConnected,
}: {
  project: ProjectData;
  members: Member[];
  role: string;
  googleConnected: boolean;
}) {
  const router = useRouter();
  const isAdmin = role === "ADMIN" || role === "OWNER";
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function patchProject(data: Record<string, unknown>) {
    setMessage(null);
    const res = await fetch(`/api/v1/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setMessage({ type: "err", text: body.error || "Update failed" });
      return false;
    }
    setMessage({ type: "ok", text: "Saved" });
    router.refresh();
    return true;
  }

  async function saveGeneral(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await patchProject({
      name: form.get("name"),
      domain: form.get("domain"),
      scanFrequency: form.get("scanFrequency"),
      emailAlerts: form.get("emailAlerts") === "on",
    });
  }

  async function saveIntegrations(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await patchProject({
      gscSiteUrl: String(form.get("gscSiteUrl") || "") || null,
      ga4PropertyId: String(form.get("ga4PropertyId") || "") || null,
    });
  }

  async function inviteMember(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch(`/api/v1/projects/${project.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), role: form.get("role") }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setMessage({ type: "err", text: body.error || "Invite failed" });
      return;
    }
    (e.target as HTMLFormElement).reset();
    setMessage({ type: "ok", text: "Member added" });
    router.refresh();
  }

  async function updateMemberRole(memberId: string, newRole: string) {
    await fetch(`/api/v1/projects/${project.id}/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    router.refresh();
  }

  async function removeMember(memberId: string) {
    await fetch(`/api/v1/projects/${project.id}/members/${memberId}`, { method: "DELETE" });
    router.refresh();
  }

  async function deleteProject() {
    if (!confirm(`Delete project "${project.name}" and all its data? This cannot be undone.`)) return;
    const res = await fetch(`/api/v1/projects/${project.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard/projects");
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <p
          className={`rounded-lg px-4 py-2 text-sm ${
            message.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </p>
      )}

      <Card title="General">
        <form onSubmit={saveGeneral} className="max-w-lg space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Project name</label>
            <input name="name" defaultValue={project.name} disabled={!isAdmin} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Domain</label>
            <input name="domain" defaultValue={project.domain} disabled={!isAdmin} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Scheduled scan frequency</label>
            <select name="scanFrequency" defaultValue={project.scanFrequency} disabled={!isAdmin} className={inputCls}>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="MANUAL">Manual only</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="emailAlerts" defaultChecked={project.emailAlerts} disabled={!isAdmin} />
            Send email alerts on ranking changes and critical issues
          </label>
          {isAdmin && (
            <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              Save changes
            </button>
          )}
        </form>
      </Card>

      <Card title="Google integrations">
        <div className="max-w-lg space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Google account</p>
              <p className="text-xs text-slate-500">
                Grants read access to Search Console and GA4 for your projects.
              </p>
            </div>
            {googleConnected ? (
              <Badge color="green">connected</Badge>
            ) : (
              <a
                href="/api/v1/google/connect"
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Connect Google
              </a>
            )}
          </div>
          <form onSubmit={saveIntegrations} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Search Console property
              </label>
              <input
                name="gscSiteUrl"
                defaultValue={project.gscSiteUrl ?? ""}
                placeholder="sc-domain:example.com or https://example.com/"
                disabled={!isAdmin}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">GA4 property ID</label>
              <input
                name="ga4PropertyId"
                defaultValue={project.ga4PropertyId ?? ""}
                placeholder="e.g. 123456789"
                disabled={!isAdmin}
                className={inputCls}
              />
            </div>
            {isAdmin && (
              <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                Save integrations
              </button>
            )}
          </form>
        </div>
      </Card>

      <Card title="Team members">
        <ul className="divide-y divide-slate-100">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {m.name ?? m.email} {m.isSelf && <span className="text-slate-400">(you)</span>}
                </p>
                <p className="text-xs text-slate-500">{m.email}</p>
              </div>
              <div className="flex items-center gap-3">
                {m.role === "OWNER" ? (
                  <Badge color="indigo">owner</Badge>
                ) : isAdmin ? (
                  <>
                    <select
                      defaultValue={m.role}
                      onChange={(e) => updateMemberRole(m.id, e.target.value)}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="MEMBER">Member</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                    <button
                      onClick={() => removeMember(m.id)}
                      className="text-xs text-slate-400 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <Badge color="gray">{m.role.toLowerCase()}</Badge>
                )}
              </div>
            </li>
          ))}
        </ul>
        {isAdmin && (
          <form onSubmit={inviteMember} className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-4">
            <input
              name="email"
              type="email"
              required
              placeholder="teammate@company.com"
              className="min-w-64 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <select name="role" defaultValue="MEMBER" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="ADMIN">Admin</option>
              <option value="MEMBER">Member</option>
              <option value="VIEWER">Viewer</option>
            </select>
            <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              Add member
            </button>
          </form>
        )}
      </Card>

      {role === "OWNER" && (
        <Card title="Danger zone">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Permanently delete this project, its keywords, rankings, backlinks, audits and reports.
            </p>
            <button
              onClick={deleteProject}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Delete project
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
