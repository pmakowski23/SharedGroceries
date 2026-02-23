import { ArrowLeft } from "lucide-react";
import { Button } from "../ui/button";

type RecipeHeaderProps = {
  name: string;
  description?: string;
  onBack: () => void;
};

export function RecipeHeader({ name, description, onBack }: RecipeHeaderProps) {
  return (
    <>
      <Button
        type="button"
        onClick={onBack}
        variant="ghost"
        className="mb-3 -ml-3"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <h1 className="text-2xl font-bold">{name}</h1>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </>
  );
}
