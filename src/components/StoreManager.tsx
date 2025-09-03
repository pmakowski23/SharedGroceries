import { useState } from "react";
import { Id, Doc } from "../../convex/_generated/dataModel";

export function StoreManager({
  currentStore,
  stores,
  onSwitchStore,
  onCreateStore,
  onManageCategories,
  onRecategorizeItems,
}: {
  currentStore: Doc<"stores"> | null;
  stores: Array<Doc<"stores">>;
  onSwitchStore: (storeId: Id<"stores">) => Promise<void>;
  onCreateStore: (name: string) => Promise<void>;
  onManageCategories: () => void;
  onRecategorizeItems: () => Promise<void>;
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const [isRecategorizing, setIsRecategorizing] = useState(false);

  const handleCreateStore = async () => {
    if (!newStoreName.trim()) return;
    await onCreateStore(newStoreName.trim());
    setNewStoreName("");
    setShowCreateForm(false);
  };

  const handleRecategorize = async () => {
    setIsRecategorizing(true);
    try {
      await onRecategorizeItems();
    } finally {
      setIsRecategorizing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Store Settings</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="text-blue-500 hover:text-blue-600 text-sm font-medium"
        >
          + New Store
        </button>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Current Store
        </label>
        <select
          value={currentStore?._id || ""}
          onChange={(e) => {
            void onSwitchStore(e.target.value as Id<"stores">);
          }}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
        >
          {stores.map((store) => (
            <option key={store._id} value={store._id}>
              {store.name}
            </option>
          ))}
        </select>
      </div>

      {showCreateForm && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Store name (e.g., Lidl, Biedronka)"
              value={newStoreName}
              onChange={(e) => setNewStoreName(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
            />
            <button
              onClick={() => void handleCreateStore()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
              }}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => onManageCategories()}
          className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
        >
          Manage Categories
        </button>
        <button
          onClick={() => void handleRecategorize()}
          disabled={isRecategorizing}
          className="flex-1 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium disabled:opacity-50"
        >
          {isRecategorizing ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
              Recategorizing...
            </span>
          ) : (
            "Recategorize All Items"
          )}
        </button>
      </div>
    </div>
  );
}
