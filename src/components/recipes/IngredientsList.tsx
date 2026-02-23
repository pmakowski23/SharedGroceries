import { Card, CardContent } from "../ui/card";

type IngredientItem = {
  _id: string;
  name: string;
  amount: number;
  unit: string;
};

type IngredientsListProps = {
  ingredients: Array<IngredientItem>;
  scale: number;
};

export function IngredientsList({ ingredients, scale }: IngredientsListProps) {
  return (
    <>
      <h2 className="mt-6 mb-3 text-lg font-semibold">Ingredients</h2>
      <Card>
        <CardContent className="divide-y p-0">
        {ingredients.map((ingredient) => (
          <div
            key={ingredient._id}
            className="px-4 py-3 flex justify-between items-center"
          >
            <span className="text-sm">{ingredient.name}</span>
            <span className="text-sm tabular-nums text-muted-foreground">
              {Math.round(ingredient.amount * scale * 10) / 10} {ingredient.unit}
            </span>
          </div>
        ))}
        </CardContent>
      </Card>
    </>
  );
}
