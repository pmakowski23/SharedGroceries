export function Header({
  currentStore,
  onToggleStoreManager,
}: {
  currentStore?: { name: string } | null;
  onToggleStoreManager: () => void;
}) {
  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-40">
      <div className="max-w-md mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">🛒 Grocery Lists</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleStoreManager}
              className="text-gray-600 hover:text-gray-800 p-2"
              title="List Settings"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                  clipRule="evenodd"
                ></path>
              </svg>
            </button>
          </div>
        </div>
        {currentStore && (
          <div className="text-sm text-gray-600 mt-1">
            Active list:{" "}
            <span className="font-medium">{currentStore.name}</span>
          </div>
        )}
      </div>
    </header>
  );
}
