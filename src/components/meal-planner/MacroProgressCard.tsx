import { isWithinTolerance, type MacroTotals } from "../../lib/nutrition";
import { Card, CardContent } from "../ui/card";

type MacroProgressCardProps = {
  dayMacros: MacroTotals;
  targetMacros: MacroTotals | null;
  tolerancePct: number;
};

export function MacroProgressCard({
  dayMacros,
  targetMacros,
  tolerancePct,
}: MacroProgressCardProps) {
  if (!targetMacros) return null;

  return (
    <Card className="mb-4">
      <CardContent className="p-3">
      <div className="mb-2 text-xs font-semibold text-muted-foreground">
        Actual / Goal / Diff
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {[
          {
            label: "kcal",
            actual: dayMacros.kcal,
            target: targetMacros.kcal,
            unit: "",
          },
          {
            label: "Protein",
            actual: dayMacros.protein,
            target: targetMacros.protein,
            unit: "g",
          },
          {
            label: "Carbs",
            actual: dayMacros.carbs,
            target: targetMacros.carbs,
            unit: "g",
          },
          {
            label: "Fat",
            actual: dayMacros.fat,
            target: targetMacros.fat,
            unit: "g",
          },
        ].map((item) => {
          const diff = item.actual - item.target;
          const within = isWithinTolerance(item.actual, item.target, tolerancePct);
          const fillPct =
            item.target > 0 ? Math.min((item.actual / item.target) * 100, 100) : 0;
          const fillColorClass = within
            ? "bg-primary/20"
            : diff > 0
              ? "bg-destructive/20"
              : "bg-secondary";

          return (
            <div
              key={item.label}
              className="relative overflow-hidden rounded-lg border bg-card px-2 py-1.5"
            >
              <div
                className={`absolute inset-y-0 left-0 ${fillColorClass}`}
                style={{ width: `${fillPct}%` }}
              />
              <div className="relative text-muted-foreground">{item.label}</div>
              <div className="relative font-semibold">
                {Math.round(item.actual)}
                {item.unit} / {Math.round(item.target)}
                {item.unit}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">
        Green day means kcal + all macros are within +/-{tolerancePct}%.
      </div>
      </CardContent>
    </Card>
  );
}
