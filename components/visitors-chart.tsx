"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@/components/ui/chart";

const config = {
  visitors: { label: "Visitors", color: "var(--chart-1)" },
  pageviews: { label: "Page views", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function VisitorsChart({
  data,
}: {
  data: { day: string; visitors: number; pageviews: number }[];
}) {
  return (
    <ChartContainer config={config} className="h-72 w-full">
      <AreaChart data={data} margin={{ left: 4, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(v) => String(v).slice(5, 10)}
          minTickGap={24}
        />
        <YAxis tickLine={false} axisLine={false} width={40} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area dataKey="pageviews" type="monotone" fill="var(--color-pageviews)" fillOpacity={0.15} stroke="var(--color-pageviews)" />
        <Area dataKey="visitors" type="monotone" fill="var(--color-visitors)" fillOpacity={0.3} stroke="var(--color-visitors)" />
      </AreaChart>
    </ChartContainer>
  );
}