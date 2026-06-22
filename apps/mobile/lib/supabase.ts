import AsyncStorage from "@react-native-async-storage/async-storage";import{createClient}from"@supabase/supabase-js";
const url=process.env.EXPO_PUBLIC_SUPABASE_URL;const key=process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key)console.warn("Supabase mobile environment variables are missing.");
export const supabase=createClient(url??"https://example.supabase.co",key??"missing",{auth:{storage:AsyncStorage,autoRefreshToken:true,persistSession:true,detectSessionInUrl:false}});
export const apiUrl=(path:string)=>`${(process.env.EXPO_PUBLIC_API_URL??"").replace(/\/$/,"")}${path}`;
export async function apiFetch(path:string,init?:RequestInit){const{data}=await supabase.auth.getSession();const response=await fetch(apiUrl(path),{...init,headers:{"Content-Type":"application/json",...(init?.headers??{}),Authorization:`Bearer ${data.session?.access_token??""}`}});const payload=await response.json();if(!response.ok)throw new Error(payload.error??"Request failed.");return payload;}
