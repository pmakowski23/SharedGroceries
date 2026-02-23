import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "../ui/button";

type GenerateActionsProps = {
  targetMacrosAvailable: boolean;
  currentDateKey: string;
  startDate: string;
  endDate: string;
};

export function GenerateActions({
  targetMacrosAvailable,
  currentDateKey,
  startDate,
  endDate,
}: GenerateActionsProps) {
  const generateGroceryList = useAction(api.mealPlans.generateGroceryList);
  const generateDayPlan = useMutation(api.mealPlans.generateDayPlan);
  const [generatingDayPlan, setGeneratingDayPlan] = useState(false);
  const [generatingGroceryList, setGeneratingGroceryList] = useState(false);

  const handleGenerateDayPlan = async () => {
    setGeneratingDayPlan(true);
    try {
      await generateDayPlan({ date: currentDateKey });
    } finally {
      setGeneratingDayPlan(false);
    }
  };

  const handleGenerateGroceryList = async () => {
    setGeneratingGroceryList(true);
    try {
      await generateGroceryList({ startDate, endDate });
    } finally {
      setGeneratingGroceryList(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => void handleGenerateDayPlan()}
        disabled={generatingDayPlan || !targetMacrosAvailable}
        className="mb-4 w-full"
      >
        {generatingDayPlan
          ? "Generating day plan..."
          : "Generate Day Plan (Fit Goals)"}
      </Button>

      <Button
        type="button"
        onClick={() => void handleGenerateGroceryList()}
        disabled={generatingGroceryList}
        variant="secondary"
        className="mb-4 w-full"
      >
        {generatingGroceryList
          ? "Generating grocery list..."
          : "Generate Grocery List for This Week"}
      </Button>
    </>
  );
}
