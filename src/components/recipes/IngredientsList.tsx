import { Card, CardContent } from "../ui/card";

type IngredientItem = {
  _id: string;
  name: string;
  amount: number;
  unit: string;
  kcalPerUnit: number;
  proteinPerUnit: number;
  carbsPerUnit: number;
  fatPerUnit: number;
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
          {ingredients.map((ingredient) => {
            const amount = Math.round(ingredient.amount * scale * 10) / 10;
            const kcal = Math.round(ingredient.kcalPerUnit * ingredient.amount * scale);
            const protein =
              Math.round(ingredient.proteinPerUnit * ingredient.amount * scale * 10) / 10;
            const carbs =
              Math.round(ingredient.carbsPerUnit * ingredient.amount * scale * 10) / 10;
            const fat = Math.round(ingredient.fatPerUnit * ingredient.amount * scale * 10) / 10;

            return (
              <div key={ingredient._id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{ingredient.name}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {amount} {ingredient.unit}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {kcal} kcal • P {protein} g • C {carbs} g • F {fat} g
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </>
  );
}
