import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger } from "./ui/select";
import { Doc, Id } from "../../convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export function CategoryManager({
  storeId,
  categories,
  onClose,
}: {
  storeId: Id<"stores">;
  categories: Array<Doc<"categories">>;
  onClose: () => void;
}) {
  const [editingCategory, setEditingCategory] =
    useState<Doc<"categories"> | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#3B82F6");

  const colorOptions: Array<{ value: string; name: string }> = [
    { value: "#EF4444", name: "Red" },
    { value: "#F97316", name: "Orange" },
    { value: "#EAB308", name: "Yellow" },
    { value: "#22C55E", name: "Green" },
    { value: "#06B6D4", name: "Teal" },
    { value: "#3B82F6", name: "Blue" },
    { value: "#8B5CF6", name: "Violet" },
    { value: "#EC4899", name: "Pink" },
    { value: "#6B7280", name: "Gray" },
    { value: "#10B981", name: "Emerald" },
    { value: "#F59E0B", name: "Amber" },
    { value: "#8B5A2B", name: "Brown" },
  ];

  const colorNameByValue: Record<string, string> = Object.fromEntries(
    colorOptions.map((o) => [o.value, o.name])
  );
  const getColorName = (value: string) => colorNameByValue[value] ?? value;

  const updateCategory = useMutation(api.groceries.updateCategory);
  const deleteCategory = useMutation(api.groceries.deleteCategory);

  const handleUpdateCategory = async (
    categoryId: Id<"categories"> | undefined,
    name: string,
    color: string
  ) => {
    await updateCategory({
      storeId,
      categoryId,
      name,
      color,
    });
  };

  const handleSave = (categoryId?: Id<"categories">) => {
    const name = categoryId ? (editingCategory?.name ?? "") : newCategoryName;
    const color = categoryId
      ? (editingCategory?.color ?? "")
      : newCategoryColor;
    if (!name.trim()) return;
    void handleUpdateCategory(categoryId, name.trim(), color);
    if (categoryId) {
      setEditingCategory(null);
    } else {
      setNewCategoryName("");
      setNewCategoryColor("#3B82F6");
      setShowAddForm(false);
    }
  };

  const handleDeleteCategory = async (categoryId: Id<"categories">) => {
    await deleteCategory({ categoryId });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto overflow-x-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Manage Categories
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                ></path>
              </svg>
            </button>
          </div>

          <div className="space-y-3 mb-6">
            {categories.map((category) => (
              <div
                key={category._id}
                className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg flex-wrap sm:flex-nowrap"
              >
                {editingCategory?._id === category._id ? (
                  <>
                    <div className="flex gap-2 flex-1 min-w-0">
                      <input
                        type="text"
                        value={editingCategory?.name ?? ""}
                        onChange={(e) =>
                          setEditingCategory({
                            ...editingCategory,
                            name: e.target.value,
                          })
                        }
                        className="flex-1 min-w-0 px-2 py-1 border border-gray-200 rounded text-sm"
                      />
                      <div className="sm:w-32 w-full">
                        <Select
                          value={editingCategory?.color ?? "#3B82F6"}
                          onValueChange={(value) =>
                            setEditingCategory({
                              ...editingCategory,
                              color: value,
                            })
                          }
                        >
                          <SelectTrigger className="px-2 py-1 h-8">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{
                                  backgroundColor:
                                    editingCategory?.color ?? "#3B82F6",
                                }}
                              />
                              <span className="text-xs">
                                {getColorName(
                                  editingCategory?.color ?? "#3B82F6"
                                )}
                              </span>
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {colorOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: opt.value }}
                                  />
                                  {opt.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSave(category._id)}
                      className="text-green-600 hover:text-green-700 text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingCategory(null)}
                      className="text-gray-500 hover:text-gray-600 text-sm"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    ></div>
                    <span className="flex-1 text-sm font-medium">
                      {category.name}
                    </span>
                    <button
                      onClick={() => setEditingCategory(category)}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        void handleDeleteCategory(category._id);
                      }}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {showAddForm ? (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex gap-2 mb-3 flex-wrap">
                <input
                  type="text"
                  placeholder="Category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded text-sm"
                />
                <div className="sm:w-36 w-full">
                  <Select
                    value={newCategoryColor}
                    onValueChange={(value) => setNewCategoryColor(value)}
                  >
                    <SelectTrigger className="h-8 px-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: newCategoryColor }}
                        />
                        <span className="text-xs">
                          {getColorName(newCategoryColor)}
                        </span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {colorOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: opt.value }}
                            />
                            {opt.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSave()}
                  className="px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                >
                  Add Category
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full px-4 py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-gray-400 hover:text-gray-700 transition-colors"
            >
              + Add New Category
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
