import { isWithinTolerance, type MacroTotals } from "../../lib/nutrition";

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
    <div className="bg-white rounded-xl border p-3 mb-4">
      <div className="text-xs font-semibold text-gray-600 mb-2">
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
            ? "bg-green-100"
            : diff > 0
              ? "bg-red-100"
              : "bg-blue-100";

          return (
            <div
              key={item.label}
              className="relative overflow-hidden border rounded-lg px-2 py-1.5 bg-white"
            >
              <div
                className={`absolute inset-y-0 left-0 ${fillColorClass}`}
                style={{ width: `${fillPct}%` }}
              />
              <div className="relative text-gray-400">{item.label}</div>
              <div className="relative font-semibold text-gray-700">
                {Math.round(item.actual)}
                {item.unit} / {Math.round(item.target)}
                {item.unit}
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-[11px] text-gray-400 mt-2">
        Green day means kcal + all macros are within +/-{tolerancePct}%.
      </div>
    </div>
  );
}
