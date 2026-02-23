type RecipeHeaderProps = {
  name: string;
  description?: string;
  onBack: () => void;
};

export function RecipeHeader({ name, description, onBack }: RecipeHeaderProps) {
  return (
    <>
      <button
        onClick={onBack}
        className="text-blue-500 text-sm mb-4 flex items-center gap-1"
      >
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </button>

      <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
      {description && <p className="text-gray-500 mt-1 text-sm">{description}</p>}
    </>
  );
}
