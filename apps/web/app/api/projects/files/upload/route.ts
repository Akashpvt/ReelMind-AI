import { NextResponse } from "next/server";
import { dispatchWorkflowTrigger } from "@/lib/workflows/engine";
import { assertWithinPlanLimit } from "@/lib/billing/subscription";
import { clientProjectUrl, sendFileUploadedEmail } from "@/lib/email/send-email";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { notifyProjectClient } from "@/lib/team/notifications";
import { resolveActiveTeam } from "@/lib/team/resolve-active-team";
import { canEditAssets } from "@/lib/team/permissions";

export const runtime = "nodejs";

const allowedExtensions = new Set(["mp4", "zip", "pdf", "png", "jpg", "jpeg"]);

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function extensionFor(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const projectId = String(form.get("projectId") ?? "");
  const file = form.get("file");

  if (!projectId || !(file instanceof File)) {
    return NextResponse.json({ error: "projectId and file are required." }, { status: 400 });
  }

  const extension = extensionFor(file.name);
  if (!allowedExtensions.has(extension)) {
    return NextResponse.json({ error: "Unsupported file type. Use mp4, zip, pdf, png, jpg, or jpeg." }, { status: 400 });
  }

  const adminSupabase = createAdminClient();
  const { data: project, error: projectError } = await adminSupabase
    .from("client_projects")
    .select("id,organization_id,project_title,client_email")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: projectError?.message ?? "Project not found." }, { status: 404 });
  }

  const activeTeam = await resolveActiveTeam(user.id, project.organization_id);
  if (!activeTeam || !canEditAssets(activeTeam.membership.role)) {
    return NextResponse.json({ error: "User must be an active organization member to upload files." }, { status: 403 });
  }

  const fileSizeMb = Math.max(1, Math.ceil(file.size / 1024 / 1024));
  const limitCheck = await assertWithinPlanLimit(project.organization_id, "fileStorageMb", fileSizeMb);
  if (!limitCheck.ok) {
    return NextResponse.json({ error: limitCheck.error, upgradeRequired: true }, { status: 402 });
  }

  const storagePath = `${project.organization_id}/${projectId}/${Date.now()}-${safeFileName(file.name)}`;
  const { error: uploadError } = await adminSupabase.storage
    .from("project-files")
    .upload(storagePath, file, { contentType: file.type || undefined, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  const { data: createdFile, error } = await adminSupabase
    .from("project_files")
    .insert({
      organization_id: project.organization_id,
      project_id: projectId,
      file_name: file.name,
      file_url: storagePath,
      file_size: file.size,
      file_type: file.type || extension,
      uploaded_by: user.id,
    })
    .select("id,organization_id,project_id,file_name,file_url,file_size,file_type,uploaded_by,created_at")
    .single();

  if (error) {
    await adminSupabase.storage.from("project-files").remove([storagePath]);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await adminSupabase.from("project_activity_logs").insert({
    organization_id: project.organization_id,
    project_id: projectId,
    user_id: user.id,
    action: "file_uploaded",
    metadata: { fileName: file.name },
  });

  await notifyProjectClient({
    organizationId: project.organization_id,
    projectId,
    type: "file_uploaded",
    title: "New file uploaded",
    message: `${file.name} was uploaded for ${project.project_title}.`,
  });
  await sendFileUploadedEmail({
    organizationId: project.organization_id,
    projectId,
    to: project.client_email,
    projectTitle: project.project_title,
    fileName: file.name,
    projectUrl: await clientProjectUrl(projectId),
  });

  await dispatchWorkflowTrigger(project.organization_id, "file_uploaded", { userId: user.id, projectId, projectTitle: project.project_title, clientEmail: project.client_email, fileId: createdFile.id, fileName: file.name });
  return NextResponse.json({ success: true, file: createdFile });
}
