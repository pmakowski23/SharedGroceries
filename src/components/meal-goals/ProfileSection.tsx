import type {
  ActivityLevel,
  GoalDirection,
  useMealGoalForm,
} from "../../hooks/useMealGoalForm";

type ProfileSectionProps = {
  form: ReturnType<typeof useMealGoalForm>;
  activityOptions: ReadonlyArray<{ value: ActivityLevel; label: string }>;
  goalOptions: ReadonlyArray<{ value: GoalDirection; label: string }>;
};

export function ProfileSection({
  form,
  activityOptions,
  goalOptions,
}: ProfileSectionProps) {
  return (
    <div className="bg-white rounded-xl border p-4 space-y-3">
      <h2 className="text-sm font-semibold text-gray-700">Profile</h2>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-gray-500">
          Age
          <input
            type="number"
            min={14}
            max={99}
            value={form.age}
            onChange={(e) => form.setAge(e.target.value === "" ? "" : Number(e.target.value))}
            className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-gray-500">
          Sex
          <select
            value={form.sex}
            onChange={(e) => form.setSex(e.target.value as "male" | "female" | "")}
            className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm bg-white"
          >
            <option value="" disabled>
              Select...
            </option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </label>
        <label className="text-xs text-gray-500">
          Height (cm)
          <input
            type="number"
            min={120}
            max={230}
            value={form.heightCm}
            onChange={(e) =>
              form.setHeightCm(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-gray-500">
          Weight (kg)
          <input
            type="number"
            min={35}
            max={250}
            value={form.weightKg}
            onChange={(e) =>
              form.setWeightKg(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-gray-500">
          Body fat % (optional)
          <input
            type="number"
            min={3}
            max={65}
            value={form.bodyFatPct}
            onChange={(e) =>
              form.setBodyFatPct(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-gray-500">
          Activity
          <select
            value={form.activityLevel}
            onChange={(e) => form.setActivityLevel(e.target.value as ActivityLevel | "")}
            className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm bg-white"
          >
            <option value="" disabled>
              Select...
            </option>
            {activityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-gray-500 col-span-2">
          Goal
          <select
            value={form.goalDirection}
            onChange={(e) => form.setGoalDirection(e.target.value as GoalDirection | "")}
            className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm bg-white"
          >
            <option value="" disabled>
              Select...
            </option>
            {goalOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        onClick={() => void form.handleSaveProfile()}
        disabled={form.savingProfile || !form.canSaveProfile}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 rounded-lg text-sm"
      >
        {form.savingProfile ? "Saving profile..." : "Save profile"}
      </button>
      {!form.canSaveProfile && (
        <p className="text-xs text-amber-600">
          Fill all required profile fields before saving.
        </p>
      )}
    </div>
  );
}
