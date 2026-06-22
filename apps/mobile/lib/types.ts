export type Organization={id:string;name:string;slug:string;role:string};
export type Project={id:string;organization_id:string;client_name:string;client_email:string|null;project_title:string;project_description:string|null;status:string;priority:string;budget:number;deadline:string|null;assigned_member_name:string|null;updated_at:string};
export type Lead={id:string;organization_id:string;name:string;email:string|null;phone:string|null;source:string|null;budget:number;notes:string|null;status:string;updated_at:string};
export type Notification={id:string;title:string|null;message:string|null;type:string|null;is_read:boolean;created_at:string;project_id:string|null};
export type AiRecommendation={id:string;title:string;recommendation:string;score:number|null;severity:string;agent_id:string|null};
export type SocialPost={id:string;platform:string;caption:string;status:string;scheduled_for?:string;created_at:string};
