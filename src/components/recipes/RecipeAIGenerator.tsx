type RecipeAIGeneratorProps = {
  showGenerate: boolean;
  aiPrompt: string;
  setAiPrompt: (value: string) => void;
  generating: boolean;
  onGenerate: () => void;
};

export function RecipeAIGenerator({
  showGenerate,
  aiPrompt,
  setAiPrompt,
  generating,
  onGenerate,
}: RecipeAIGeneratorProps) {
  return (
    showGenerate && (
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          Generate with AI
        </h3>
        <textarea
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder='Describe a meal (e.g. "high-protein chicken stir fry for 2")...'
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm resize-none"
        />
        <button
          onClick={onGenerate}
          disabled={generating || !aiPrompt.trim()}
          className="mt-2 w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
        >
          {generating ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating...
            </span>
          ) : (
            "Generate Recipe"
          )}
        </button>
      </div>
    )
  );
}
