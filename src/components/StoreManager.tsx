import { useState } from "react";
import { Id, Doc } from "../../convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CategoryManager } from "./CategoryManager";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { nowEpochMs } from "../lib/date";

export function StoreManager({
  currentStore,
  categories,
}: {
  currentStore: Doc<"stores"> | null;
  categories: Array<Doc<"categories">>;
}) {
  const stores = useQuery(api.groceries.getStores, {});

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const createStore = useMutation(
    api.groceries.createStore
  ).withOptimisticUpdate((store, args) => {
    const data = store.getQuery(api.groceries.getGroceryList, {});
    const stores = store.getQuery(api.groceries.getStores, {});
    if (!stores) return;

    const tempId = ("temp_store_" +
      Math.random().toString(36).slice(2)) as Id<"stores">;
    const nextStores = [
      ...stores,
      {
        _id: tempId,
        _creationTime: nowEpochMs(),
        name: args.name,
        isDefault: false,
        createdAt: nowEpochMs(),
      },
    ];
    store.setQuery(api.groceries.getStores, {}, nextStores);

    if (data && !data.currentStore) {
      // If we were uninitialized, set current store optimistically
      const next = {
        ...data,
        currentStore: nextStores[nextStores.length - 1],
      };
      store.setQuery(api.groceries.getGroceryList, {}, next);
    }
  });
  const switchStore = useMutation(
    api.groceries.switchStore
  ).withOptimisticUpdate((store, args) => {
    const data = store.getQuery(api.groceries.getGroceryList, {});
    const stores = store.getQuery(api.groceries.getStores, {});
    if (!data || !stores) return;

    const nextCurrent = stores.find((s) => s._id === args.storeId) || null;
    if (!nextCurrent) return;

    const next = {
      ...data,
      currentStore: nextCurrent,
      // On switch, clear items/categories until server refills to avoid flicker
      categories: [],
      itemsByCategory: {},
    };
    store.setQuery(api.groceries.getGroceryList, {}, next);
  });
  const handleCreateStore = async () => {
    if (!newStoreName.trim()) return;
    await createStore({ name: newStoreName.trim() });
    setNewStoreName("");
    setShowCreateForm(false);
  };

  const [showCategoryManager, setShowCategoryManager] = useState(false);

  const [isRecategorizing, setIsRecategorizing] = useState(false);
  const recategorizeAllItems = useAction(api.groceries.recategorizeAllItems);
  const handleRecategorize = async () => {
    setIsRecategorizing(true);
    try {
      await recategorizeAllItems();
    } finally {
      setIsRecategorizing(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">List Settings</h2>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          + New List
        </Button>
      </div>

      <div className="mb-4">
        <div className="mb-2 text-sm font-medium text-muted-foreground">Current List</div>
        <Select
          value={currentStore?._id || undefined}
          onValueChange={(value) => {
            void switchStore({ storeId: value as Id<"stores"> });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select list" />
          </SelectTrigger>
          <SelectContent>
            {stores?.map((store) => (
              <SelectItem key={store._id} value={store._id}>
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showCreateForm && (
        <div className="mb-4 rounded-lg bg-muted p-3">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="List name (e.g., Lidl, Biedronka)"
              value={newStoreName}
              onChange={(e) => setNewStoreName(e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              onClick={() => void handleCreateStore()}
            >
              Create
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreateForm(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setShowCategoryManager(true)}
          className="flex-1"
        >
          Manage Categories
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleRecategorize()}
          disabled={isRecategorizing}
          className="flex-1"
        >
          {isRecategorizing ? (
            <span className="flex items-center justify-center gap-2">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
              Recategorizing...
            </span>
          ) : (
            "Recategorize All Items"
          )}
        </Button>
      </div>
      {showCategoryManager && currentStore && (
        <CategoryManager
          storeId={currentStore._id}
          categories={categories}
          onClose={() => {
            setShowCategoryManager(false);
          }}
        />
      )}
      </CardContent>
    </Card>
  );
}
