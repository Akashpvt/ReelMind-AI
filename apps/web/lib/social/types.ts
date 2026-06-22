export const socialPlatforms=["instagram","facebook","linkedin","youtube"] as const;export type SocialPlatform=typeof socialPlatforms[number];
export function isSocialPlatform(value:unknown):value is SocialPlatform{return typeof value==="string"&&socialPlatforms.includes(value as SocialPlatform)}
export type SocialPostInput={title:string;caption:string;hashtags:string[];cta:string;mediaUrl:string|null;mediaType:"text"|"image"|"video"|"reel"|"short"};
