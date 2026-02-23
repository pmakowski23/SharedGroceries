import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger } from "./ui/select";
import { Doc, Id } from "../../convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";

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

  const updateCategory = useMutation(
    api.groceries.updateCategory
  ).withOptimisticUpdate((store, args) => {
    const data = store.getQuery(api.groceries.getGroceryList, {});
    if (!data) return;
    if (!data.currentStore) return;

    // Update existing or append new category
    const isUpdate = !!args.categoryId;
    const categories = [...data.categories];
    if (isUpdate) {
      const idx = categories.findIndex((c) => c._id === args.categoryId);
      if (idx !== -1) {
        categories[idx] = {
          ...categories[idx],
          name: args.name,
          color: args.color,
        };
      }
    } else {
      // Create a temporary client-only id to avoid key collisions
      const tempId = ("temp_" +
        Math.random().toString(36).slice(2)) as Id<"categories">;
      categories.push({
        _id: tempId,
        name: args.name,
        color: args.color,
        order: categories.length,
        storeId,
        _creationTime: Date.now(),
      });
    }

    const next = { ...data, categories };
    store.setQuery(api.groceries.getGroceryList, {}, next);
  });

  const deleteCategory = useMutation(
    api.groceries.deleteCategory
  ).withOptimisticUpdate((store, args) => {
    const data = store.getQuery(api.groceries.getGroceryList, {});
    if (!data) return;
    if (!data.currentStore) return;

    const categories = data.categories.filter((c) => c._id !== args.categoryId);
    const itemsByCategory: Record<string, Array<Doc<"groceryItems">>> = {};
    const toDelete = data.categories.find((c) => c._id === args.categoryId);
    const deletedName = toDelete?.name;
    for (const [cat, items] of Object.entries(data.itemsByCategory)) {
      if (cat === deletedName) {
        // move items to Uncategorized
        const moved = items.map((it) => ({ ...it, category: "Uncategorized" }));
        const existing = data.itemsByCategory["Uncategorized"] || [];
        itemsByCategory["Uncategorized"] = [...existing, ...moved];
      } else {
        itemsByCategory[cat] = items;
      }
    }

    // Ensure Uncategorized category exists
    const hasUncategorized = categories.some((c) => c.name === "Uncategorized");
    const nextCategories = hasUncategorized
      ? categories
      : [
          ...categories,
          {
            _id: ("temp_uncat_" +
              Math.random().toString(36).slice(2)) as Id<"categories">,
            name: "Uncategorized",
            color: "#6B7280",
            order: categories.length,
            storeId,
            _creationTime: Date.now(),
          },
        ];

    const next = {
      ...data,
      categories: nextCategories,
      itemsByCategory,
    };
    store.setQuery(api.groceries.getGroceryList, {}, next);
  });

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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[80vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
        </DialogHeader>

          <div className="mb-6 space-y-3">
            {categories.map((category) => (
              <div
                key={category._id}
                className="flex flex-wrap items-center gap-3 rounded-lg border p-3 sm:flex-nowrap"
              >
                {editingCategory?._id === category._id ? (
                  <>
                    <div className="flex gap-2 flex-1 min-w-0">
                      <Input
                        type="text"
                        value={editingCategory?.name ?? ""}
                        onChange={(e) =>
                          setEditingCategory({
                            ...editingCategory,
                            name: e.target.value,
                          })
                        }
                        className="h-8 min-w-0 flex-1"
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
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => handleSave(category._id)}
                    >
                      Save
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingCategory(null)}
                    >
                      Cancel
                    </Button>
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
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingCategory(category)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        void handleDeleteCategory(category._id);
                      }}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>

          {showAddForm ? (
            <div className="rounded-lg bg-muted p-3">
              <div className="flex gap-2 mb-3 flex-wrap">
                <Input
                  type="text"
                  placeholder="Category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="min-w-0 flex-1"
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
                <Button type="button" onClick={() => handleSave()}>
                  Add Category
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddForm(true)}
              className="w-full border-dashed"
            >
              + Add New Category
            </Button>
          )}
      </DialogContent>
    </Dialog>
  );
}
