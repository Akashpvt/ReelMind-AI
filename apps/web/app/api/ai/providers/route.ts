import { NextResponse } from "next/server";

import { resolvePlatformAdmin } from "@/lib/enterprise/admin-auth";
import { providerStatuses, routeAiText } from "@/lib/ai-router/router";
import type { AiTextProvider } from "@/lib/ai-router/types";
import { permissionError, resolvePermission } from "@/lib/team/permission-guards";

const providerIds=["openai","gemini","claude"] as const;
export async function GET(request:Request){const url=new URL(request.url);if(url.searchParams.get("scope")==="platform"){const access=await resolvePlatformAdmin();if(!access.ok)return NextResponse.json({error:access.error},{status:access.status});return NextResponse.json({providers:await providerStatuses()});}const access=await resolvePermission("workspace:read",url.searchParams.get("organizationId"));if(!access.ok)return permissionError(access);return NextResponse.json({providers:await providerStatuses()});}
export async function POST(){const access=await resolvePlatformAdmin();if(!access.ok)return NextResponse.json({error:access.error},{status:access.status});const results=[];for(const id of providerIds){try{const response=await routeAiText({userId:access.user.id,endpoint:"/api/ai/providers",requestType:"health",prompt:"Reply with exactly: OK",system:"This is a production provider health probe.",provider:id as AiTextProvider,allowFallback:false,metadata:{healthProbe:true}});results.push({provider:id,success:true,latencyMs:response.usage.latencyMs});}catch(error){results.push({provider:id,success:false,error:error instanceof Error?error.message:"Probe failed."});}}return NextResponse.json({results,providers:await providerStatuses()});}
