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
      <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Ingredients</h2>
      <div className="bg-white rounded-xl border divide-y">
        {ingredients.map((ingredient) => (
          <div
            key={ingredient._id}
            className="px-4 py-3 flex justify-between items-center"
          >
            <span className="text-sm text-gray-800">{ingredient.name}</span>
            <span className="text-sm text-gray-500 tabular-nums">
              {Math.round(ingredient.amount * scale * 10) / 10} {ingredient.unit}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
