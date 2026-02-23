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
      <span className="text-sm text-gray-600">Servings:</span>
      <button
        onClick={onDecrease}
        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100"
      >
        -
      </button>
      <span className="text-lg font-semibold w-8 text-center">{servings}</span>
      <button
        onClick={onIncrease}
        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100"
      >
        +
      </button>
    </div>
  );
}
