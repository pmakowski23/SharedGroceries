import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";

type WeekNavigatorProps = {
  weekLabel: string;
  onPrevWeek: () => void;
  onNextWeek: () => void;
};

export function WeekNavigator({
  weekLabel,
  onPrevWeek,
  onNextWeek,
}: WeekNavigatorProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onPrevWeek}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <span className="text-sm font-medium text-muted-foreground">{weekLabel}</span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onNextWeek}
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}
