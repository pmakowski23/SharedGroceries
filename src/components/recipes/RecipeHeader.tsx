import { ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { PageHeader } from "../PageHeader";
import { Button } from "../ui/button";

type RecipeHeaderProps = {
  name: string;
  description?: string;
};

export function RecipeHeader({ name, description }: RecipeHeaderProps) {
  return (
    <>
      <PageHeader title={name} />
      <Button type="button" variant="ghost" className="mb-2 -ml-3" asChild>
        <Link to="/recipes">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </Button>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </>
  );
}
