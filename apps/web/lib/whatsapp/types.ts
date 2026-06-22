export const whatsappTriggerEvents=["lead_created","lead_assigned","project_assigned","review_requested","project_approved","invoice_created","invoice_overdue","payment_received","project_delivered"] as const;
export type WhatsAppTriggerEvent=typeof whatsappTriggerEvents[number];
export type WhatsAppEventPayload=Record<string,unknown>&{phone?:string|null;projectId?:string;leadId?:string;name?:string;projectTitle?:string;invoiceNumber?:string|null;amount?:string|number};
export const clientCommands=["status","invoice","files","progress"] as const;
