import { ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { PageHeader } from "../PageHeader";
import { Button } from "../ui/button";

type RecipeHeaderProps = {
  name: string;
  description?: string;
  onEditClick: () => void;
  editDisabled?: boolean;
};

export function RecipeHeader({
  name,
  description,
  onEditClick,
  editDisabled = false,
}: RecipeHeaderProps) {
  return (
    <>
      <PageHeader title={name} />
      <div className="mb-2 flex items-center justify-between gap-2">
        <Button type="button" variant="ghost" className="-ml-3" asChild>
          <Link to="/recipes">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onEditClick}
          disabled={editDisabled}
        >
          Edit
        </Button>
      </div>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </>
  );
}
