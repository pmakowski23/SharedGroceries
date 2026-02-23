import type { MacroTotals } from "../../lib/nutrition";

type MacrosGridProps = {
  totalMacros: MacroTotals;
};

export function MacrosGrid({ totalMacros }: MacrosGridProps) {
  return (
    <div className="grid grid-cols-4 gap-2 mt-4">
      {[
        { label: "Calories", value: `${Math.round(totalMacros.kcal)}`, unit: "kcal" },
        { label: "Protein", value: `${Math.round(totalMacros.protein)}`, unit: "g" },
        { label: "Carbs", value: `${Math.round(totalMacros.carbs)}`, unit: "g" },
        { label: "Fat", value: `${Math.round(totalMacros.fat)}`, unit: "g" },
      ].map((macro) => (
        <div
          key={macro.label}
          className="bg-white rounded-lg border p-2.5 text-center"
        >
          <div className="text-xs text-gray-400">{macro.label}</div>
          <div className="text-lg font-bold text-gray-900">{macro.value}</div>
          <div className="text-xs text-gray-400">{macro.unit}</div>
        </div>
      ))}
    </div>
  );
}
