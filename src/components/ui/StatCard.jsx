import React from "react";
import { Card } from "./Card";

export function StatCard({ title, value, subtext, trend, icon, variant = "default", size = "md" }) {
  const isHighlight = variant === "highlight";

  const sizes = {
    sm: {
      padding: "p-4",
      heading: "text-caption",
      value: "text-title-l",
      gap: "gap-1.5",
    },
    md: {
      padding: "p-5",
      heading: "text-caption",
      value: "text-title-xl",
      gap: "gap-2",
    },
  };

  const activeSize = sizes[size] || sizes.md;

  const cardVariant = "elevated";
  const cardClassName = isHighlight
    ? "bg-primary-50 border-primary-100 shadow-soft text-primary-900"
    : "";

  const titleColor = isHighlight ? "text-primary-700" : "text-surface-500";
  const iconColor = isHighlight ? "text-primary-600" : "text-primary-600";
  const valueColor = isHighlight ? "text-primary-900" : "text-surface-900";
  const subtextColor = isHighlight ? "text-primary-600" : "text-surface-400";

  const trendClasses =
    trend === "up"
      ? "bg-success-500/10 text-success-500"
      : trend === "down"
      ? "bg-danger-500/10 text-danger-500"
      : "bg-warning-500/10 text-warning-500";
  const trendLabel = trend === "up" ? "+" : trend === "down" ? "-" : trend ? trend : "";

  return (
    <Card variant={cardVariant} hover={false} className={`relative overflow-hidden ${cardClassName}`}>
      <div className={`${activeSize.padding} flex flex-col ${activeSize.gap}`}>
        <div className="flex items-center justify-between">
          <p className={`${activeSize.heading} font-semibold ${titleColor}`}>{title}</p>
          {icon && <div className={iconColor}>{icon}</div>}
        </div>

        <div className="flex items-baseline gap-2">
          <h4 className={`${activeSize.value} tracking-tight ${valueColor}`}>{value}</h4>
        </div>

        {(subtext || trend) && (
          <div className="flex items-center gap-2">
            {trend && (
              <span
                className={`rounded-pill px-2 py-0.5 text-tiny font-bold ${trendClasses}`}
                aria-label={trend === "up" ? "Trending up" : trend === "down" ? "Trending down" : "Trend"}
              >
                {trendLabel}
              </span>
            )}
            {subtext && <p className={`text-tiny ${subtextColor}`}>{subtext}</p>}
          </div>
        )}
      </div>
    </Card>
  );
}
