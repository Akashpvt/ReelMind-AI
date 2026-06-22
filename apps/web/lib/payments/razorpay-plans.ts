export const paidPlans = {
  starter: {
    id: "starter",
    name: "Starter",
    amount: 999,
    credits: 1000,
    description: "Solo agency plan with room for early client work.",
    limits: {
      leads: 50,
      projects: 10,
      teamMembers: 3,
      fileStorageMb: 1024,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    amount: 2999,
    credits: 5000,
    description: "Growing team plan with higher project and storage limits.",
    limits: {
      leads: 250,
      projects: 50,
      teamMembers: 10,
      fileStorageMb: 10240,
    },
  },
  agency: {
    id: "agency",
    name: "Agency",
    amount: 7999,
    credits: 20000,
    description: "Full agency plan for larger teams and delivery volume.",
    limits: {
      leads: 1000,
      projects: 250,
      teamMembers: 50,
      fileStorageMb: 102400,
    },
  },
} as const;

export const freePlan = {
  id: "free",
  name: "Free",
  amount: 0,
  credits: 20,
  description: "Trial workspace with basic CRM and project limits.",
  limits: {
    leads: 10,
    projects: 3,
    teamMembers: 1,
    fileStorageMb: 100,
  },
} as const;

export type PaidPlanId = keyof typeof paidPlans;
export type PlanId = PaidPlanId | typeof freePlan.id;

export function isPaidPlanId(value: unknown): value is PaidPlanId {
  return typeof value === "string" && value in paidPlans;
}

export function getPlanLimit(planName: string) {
  if (planName === "agency") return paidPlans.agency.credits;
  if (planName === "pro") return paidPlans.pro.credits;
  if (planName === "starter") return paidPlans.starter.credits;
  return freePlan.credits;
}

export function getPlanLabel(planName: string) {
  if (planName === "agency") return "Agency";
  if (planName === "pro") return "Pro";
  if (planName === "starter") return "Starter";
  return "Free";
}

export function allPlans() {
  return [freePlan, paidPlans.starter, paidPlans.pro, paidPlans.agency];
}

export function planLimits(planName: string) {
  if (planName === "agency") return paidPlans.agency.limits;
  if (planName === "pro") return paidPlans.pro.limits;
  if (planName === "starter") return paidPlans.starter.limits;
  return freePlan.limits;
}

export function amountToPaise(amount: number) {
  return amount * 100;
}

export function formatRupees(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
