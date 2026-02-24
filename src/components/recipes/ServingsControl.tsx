import { Dispatch, SetStateAction } from "react";
import { Button } from "../ui/button";

type ServingsControlProps = {
  servings: number;
  setServings: Dispatch<SetStateAction<number | null>>;
};

export function ServingsControl({ servings, setServings }: ServingsControlProps) {
  const handleDecrease = () => {
    setServings(Math.max(1, servings - 1));
  };

  const handleIncrease = () => {
    setServings(servings + 1);
  };

  return (
    <div className="flex items-center gap-3 mt-4">
      <span className="text-sm text-muted-foreground">Servings:</span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleDecrease}
        className="h-8 w-8 rounded-full"
      >
        -
      </Button>
      <span className="text-lg font-semibold w-8 text-center">{servings}</span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleIncrease}
        className="h-8 w-8 rounded-full"
      >
        +
      </Button>
    </div>
  );
}
