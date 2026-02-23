type InstructionsListProps = {
  instructions: Array<string>;
};

export function InstructionsList({ instructions }: InstructionsListProps) {
  return (
    <>
      <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">
        Instructions
      </h2>
      <ol className="space-y-3">
        {instructions.map((step, index) => (
          <li key={index} className="flex gap-3 bg-white rounded-xl border p-4">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center">
              {index + 1}
            </span>
            <p className="text-sm text-gray-700 leading-relaxed">{step}</p>
          </li>
        ))}
      </ol>
    </>
  );
}
