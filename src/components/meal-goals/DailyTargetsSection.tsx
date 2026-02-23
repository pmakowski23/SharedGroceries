import type { useMealGoalForm } from "../../hooks/useMealGoalForm";

type DailyTargetsSectionProps = {
  form: ReturnType<typeof useMealGoalForm>;
};

export function DailyTargetsSection({ form }: DailyTargetsSectionProps) {
  return (
    <div className="bg-white rounded-xl border p-4 space-y-3">
      <h2 className="text-sm font-semibold text-gray-700">Daily targets</h2>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-gray-500">
          kcal
          <input
            type="number"
            value={form.kcal}
            readOnly
            className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-gray-500">
          Protein (g)
          <input
            type="number"
            min={0}
            step={1}
            value={form.protein}
            onChange={(e) =>
              form.setProtein(
                e.target.value === "" ? "" : form.parseNonNegativeInt(e.target.value),
              )
            }
            className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-gray-500">
          Carbs (g)
          <input
            type="number"
            min={0}
            step={1}
            value={form.carbs}
            onChange={(e) =>
              form.setCarbs(
                e.target.value === "" ? "" : form.parseNonNegativeInt(e.target.value),
              )
            }
            className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-gray-500">
          Fat (g)
          <input
            type="number"
            min={0}
            step={1}
            value={form.fat}
            onChange={(e) =>
              form.setFat(
                e.target.value === "" ? "" : form.parseNonNegativeInt(e.target.value),
              )
            }
            className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-gray-500 col-span-2">
          Tolerance (%)
          <input
            type="number"
            min={1}
            max={25}
            value={form.tolerancePct}
            onChange={(e) =>
              form.setTolerancePct(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm"
          />
        </label>
      </div>
      <button
        onClick={() => void form.handleSaveTargets()}
        disabled={form.savingTargets || !form.canSaveTargets}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-2.5 rounded-lg text-sm"
      >
        {form.savingTargets ? "Saving targets..." : "Save targets"}
      </button>
      {!form.canSaveTargets && (
        <p className="text-xs text-amber-600">
          Set protein, carbs, fat and tolerance before saving.
        </p>
      )}
    </div>
  );
}
