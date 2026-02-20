export const groceryItemPrompt = (
  currentStoreName: string,
  categories: string[],
  itemName: string,
) => `
Categorize this grocery item for "${currentStoreName}" into one of these categories:

${categories.join("\n")}

Item: "${itemName}"

Return valid JSON with exactly this shape: {"category":"<one category from the list>"}.
`;
