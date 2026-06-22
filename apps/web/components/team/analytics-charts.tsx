"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MonthlyRevenue } from "@/lib/team/analytics";

type StatusSlice = {
  name: string;
  value: number;
};

const sliceColors = ["#12B5FF", "#86EFAC", "#FDBA74", "#FDA4AF", "#A78BFA", "#F0F9FF", "#67E8F9", "#F472B6"];

export function AnalyticsCharts({ revenue, statusDistribution }: { revenue: MonthlyRevenue[]; statusDistribution: StatusSlice[] }) {
  return (
    <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Revenue Trend</p>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenue}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#94A3B8", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94A3B8", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "rgba(18,181,255,0.08)" }} contentStyle={{ background: "#08111F", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "#F8FAFC" }} />
              <Bar dataKey="revenue" fill="#12B5FF" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Project Status Distribution</p>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={statusDistribution} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
                {statusDistribution.map((slice, index) => (
                  <Cell key={slice.name} fill={sliceColors[index % sliceColors.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#08111F", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "#F8FAFC" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {statusDistribution.map((slice, index) => (
            <div key={slice.name} className="flex items-center gap-2 text-xs text-mist">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: sliceColors[index % sliceColors.length] }} />
              <span>{slice.name}: {slice.value}</span>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
