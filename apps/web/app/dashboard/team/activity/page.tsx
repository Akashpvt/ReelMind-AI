import { ListCard, Row, TeamShell } from "@/components/team/team-shell";
import { activityLabel } from "@/lib/team/project-types";
import { loadTeamData } from "@/lib/team/load-team-data";

export const dynamic = "force-dynamic";

function metadataSummary(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return "No metadata";
  const values = metadata as Record<string, unknown>;
  if (typeof values.message === "string") return values.message;
  if (typeof values.notePreview === "string") return `note: ${values.notePreview}`;
  if (typeof values.fileName === "string") return `deliverable: ${values.fileName}`;
  if (typeof values.messagePreview === "string") return `message: ${values.messagePreview}`;
  if (typeof values.assignedMemberName === "string") {
    const role = typeof values.assignedMemberRole === "string" ? ` (${values.assignedMemberRole})` : "";
    return `assigned to ${values.assignedMemberName}${role}`;
  }
  const entries = Object.entries(values);
  return entries.length
    ? entries.map(([key, value]) => `${key}: ${String(value)}`).join(" / ")
    : "No metadata";
}

export default async function TeamActivityPage() {
  const { activity, projects, activeTeam } = await loadTeamData();

  return (
    <TeamShell title="Activity" subtitle="Organization activity timeline and client project movement.">
      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <ListCard title={`${activeTeam?.organization.name ?? "Organization"} Timeline`} empty="No team activity yet.">
          {activity.map((entry) => (
            <Row key={entry.id} title={activityLabel(entry.action)} detail={`${metadataSummary(entry.metadata)} / ${new Date(entry.created_at).toLocaleString()}`} />
          ))}
        </ListCard>
        <ListCard title="Client Projects" empty="Client projects will appear here.">
          {projects.map((project) => (
            <Row key={project.id} title={project.project_title} detail={`${project.status} / ${new Date(project.created_at).toLocaleString()}`} />
          ))}
        </ListCard>
      </section>
    </TeamShell>
  );
}
