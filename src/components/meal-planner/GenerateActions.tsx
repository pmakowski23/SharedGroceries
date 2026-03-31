import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "../ui/button";

type GenerateActionsProps = {
  targetMacrosAvailable: boolean;
  currentDateKey: string;
  startDate: string;
  endDate: string;
  weekDateKeys: string[];
};

export function GenerateActions({
  targetMacrosAvailable,
  currentDateKey,
  startDate,
  endDate,
  weekDateKeys,
}: GenerateActionsProps) {
  const generateGroceryList = useAction(api.mealPlans.generateGroceryList);
  const generateDayPlan = useMutation(api.mealPlans.generateDayPlan);
  const generateWeekPlan = useMutation(api.mealPlans.generateWeekPlan);
  const [generatingDayPlan, setGeneratingDayPlan] = useState(false);
  const [generatingWeekPlan, setGeneratingWeekPlan] = useState(false);
  const [generatingGroceryList, setGeneratingGroceryList] = useState(false);

  const handleGenerateDayPlan = async () => {
    setGeneratingDayPlan(true);
    try {
      await generateDayPlan({ date: currentDateKey });
    } finally {
      setGeneratingDayPlan(false);
    }
  };

  const handleGenerateWeekPlan = async () => {
    setGeneratingWeekPlan(true);
    try {
      await generateWeekPlan({ dates: weekDateKeys });
    } finally {
      setGeneratingWeekPlan(false);
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
          : "Generate Day Plan"}
      </Button>

      <Button
        type="button"
        onClick={() => void handleGenerateWeekPlan()}
        disabled={generatingWeekPlan || !targetMacrosAvailable}
        className="mb-4 w-full"
        variant="secondary"
      >
        {generatingWeekPlan
          ? "Generating week plan..."
          : "Generate Whole Week"}
      </Button>

      <Button
        type="button"
        onClick={() => void handleGenerateGroceryList()}
        disabled={generatingGroceryList}
        variant="outline"
        className="mb-4 w-full"
      >
        {generatingGroceryList
          ? "Generating grocery list..."
          : "Generate Grocery List for This Week"}
      </Button>
    </>
  );
}
