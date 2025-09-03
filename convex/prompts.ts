export const groceryItemPrompt = (
  currentStoreName: string,
  categories: string[],
  itemName: string
) => `
Categorize this grocery item for "${currentStoreName}" into one of these categories:

${categories.join("\n")}

Item: "${itemName}"

Respond with just the category name, nothing else.
`;
