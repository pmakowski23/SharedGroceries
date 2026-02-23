import type { MacroTotals } from "../../lib/nutrition";
import { Card, CardContent } from "../ui/card";

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
        <Card key={macro.label}>
          <CardContent className="p-2.5 text-center">
            <div className="text-xs text-muted-foreground">{macro.label}</div>
            <div className="text-lg font-bold">{macro.value}</div>
            <div className="text-xs text-muted-foreground">{macro.unit}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
