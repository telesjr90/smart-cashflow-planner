import React from "react";

export function Card({
  children,
  className = "",
  variant = "elevated", // elevated | flat | outline | ghost
  size = "md", // sm | md | lg
  radius, // optional radius override: sm -> rounded-2xl, lg -> rounded-3xl
  hover = true,
  ...props
}) {
  const variants = {
    elevated: "bg-surface-100 border border-surface-200/50 shadow-soft",
    flat: "bg-surface-100 border border-surface-200/40 shadow-none",
    outline: "bg-transparent border border-surface-200/60 shadow-none",
    ghost: "bg-transparent shadow-none",
  };

  const interactive = Boolean(props.onClick);
  const radiusMap = {
    sm: "rounded-2xl",
    md: "rounded-3xl",
    lg: "rounded-3xl",
  };

  const resolvedRadius = radius ? radiusMap[radius] : radiusMap[size];

  const interactiveStates =
    hover && interactive
      ? "cursor-pointer hover:shadow-soft hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-50 transition-all duration-200"
      : "";

  const base = "relative";

  return (
    <div
      className={`${base} ${variants[variant] || variants.elevated} ${resolvedRadius || radiusMap.md} ${interactiveStates} ${className}`}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                props.onClick?.(e);
              }
            }
          : undefined
      }
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className = "",
  as: Heading = "h3",
  size = "md", // sm | md | lg
  withDivider = false,
}) {
  const paddings = {
    sm: "px-4 pt-4 pb-2",
    md: "px-5 pt-5 pb-3",
    lg: "px-6 pt-6 pb-4",
  };

  return (
    <div
      className={`flex items-start justify-between ${paddings[size] || paddings.md} ${
        withDivider ? "border-b border-surface-200/50" : ""
      } ${className}`}
    >
      <div className="space-y-0.5">
        <Heading className="text-title-l text-surface-900">{title}</Heading>
        {subtitle && <p className="text-caption text-surface-500">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ children, className = "", size = "md", withDivider = false, noPadding = false }) {
  const paddings = {
    sm: "p-4",
    md: "p-5",
    lg: "p-6",
  };

  return (
    <div
      className={`${noPadding ? "" : paddings[size] || paddings.md} ${
        withDivider ? "border-t border-surface-200/50" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

