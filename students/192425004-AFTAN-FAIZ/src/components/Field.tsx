import { cloneElement, isValidElement, useId, type ReactNode } from "react";

type ControlProps = {
  "aria-label"?: string;
  "aria-describedby"?: string;
};

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const hintId = useId();
  return (
    <label className="field">
      <span>{label}</span>
      {isValidElement<ControlProps>(children)
        ? cloneElement(children, {
            "aria-label": children.props["aria-label"] || label,
            "aria-describedby":
              [children.props["aria-describedby"], hint ? hintId : undefined]
                .filter(Boolean)
                .join(" ") || undefined,
          })
        : children}
      {hint && <small id={hintId}>{hint}</small>}
    </label>
  );
}
