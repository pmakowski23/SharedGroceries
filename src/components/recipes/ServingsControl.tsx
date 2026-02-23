import { Button } from "../ui/button";

type ServingsControlProps = {
  servings: number;
  onDecrease: () => void;
  onIncrease: () => void;
};

export function ServingsControl({
  servings,
  onDecrease,
  onIncrease,
}: ServingsControlProps) {
  return (
    <div className="flex items-center gap-3 mt-4">
      <span className="text-sm text-muted-foreground">Servings:</span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onDecrease}
        className="h-8 w-8 rounded-full"
      >
        -
      </Button>
      <span className="text-lg font-semibold w-8 text-center">{servings}</span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onIncrease}
        className="h-8 w-8 rounded-full"
      >
        +
      </Button>
    </div>
  );
}
