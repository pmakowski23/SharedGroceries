import { ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "../ui/button";

type RecipeHeaderProps = {
  name: string;
  description?: string;
};

export function RecipeHeader({ name, description }: RecipeHeaderProps) {
  return (
    <>
      <Button type="button" variant="ghost" className="mb-3 -ml-3" asChild>
        <Link to="/recipes">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </Button>

      <h1 className="text-2xl font-bold">{name}</h1>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </>
  );
}
