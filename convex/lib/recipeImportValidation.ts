type GeneratedRecipeForValidation = {
  instructions: Array<string>;
  ingredients: Array<{ name: string }>;
};

type CompletenessReport = {
  isStructuredRecipe: boolean;
  missingIngredients: Array<string>;
  missingStepTokens: Array<string>;
  missingSectionTokens: Array<string>;
};

const DIRECTION_MARKER_REGEX = /\b(directions|instruction|method|preparation)\b/i;
const STOP_WORDS = new Set([
  "the",
  "and",
  "with",
  "for",
  "from",
  "into",
  "onto",
  "your",
  "this",
  "that",
  "each",
  "then",
  "until",
  "over",
  "heat",
  "cook",
  "place",
  "add",
  "mix",
  "make",
  "use",
  "let",
  "all",
  "are",
  "was",
  "were",
  "have",
  "has",
  "had",
  "salt",
  "pepper",
  "taste",
  "cup",
  "cups",
  "tbsp",
  "tsp",
  "tablespoon",
  "teaspoon",
  "oz",
  "ounce",
  "ounces",
  "slice",
  "slices",
  "piece",
  "pieces",
  "gram",
  "grams",
  "ml",
  "liter",
  "liters",
]);

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeToken(value: string): string {
  return normalizeSpaces(
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " "),
  );
}

function splitLines(text: string): Array<string> {
  return text
    .split("\n")
    .map((line) => normalizeSpaces(line))
    .filter((line) => line.length > 0);
}

function hasNumericAmountMarker(line: string): boolean {
  return /^[-*•]?\s*(\d+|[\u00BC-\u00BE\u2150-\u215E]|\d+\s*\/\s*\d+)/u.test(line);
}

function cleanIngredientLine(line: string): string {
  const withoutBullet = line.replace(/^[-*•]\s*/, "");
  const withoutParen = withoutBullet.replace(/\([^)]*\)/g, " ");
  const withoutLeadingAmount = withoutParen.replace(
    /^\s*([\u00BC-\u00BE\u2150-\u215E]|\d+(\.\d+)?|\d+\s*\/\s*\d+)\s*[a-zA-Z]*\s*/u,
    "",
  );
  const withoutLeadingUnits = withoutLeadingAmount.replace(
    /^\s*(cup|cups|tbsp|tsp|tablespoon|tablespoons|teaspoon|teaspoons|oz|ounce|ounces|g|kg|mg|ml|l|liter|liters|slice|slices|piece|pieces|clove|cloves)\b\s*/i,
    "",
  );
  const withoutToTaste = withoutLeadingUnits.replace(/\bto taste\b/gi, "");
  return normalizeSpaces(withoutToTaste);
}

function ingredientCandidatesFromSection(lines: Array<string>): Array<string> {
  const unique = new Set<string>();
  for (const line of lines) {
    if (/^[A-Za-z ]+:$/.test(line)) continue;
    if (!(hasNumericAmountMarker(line) || /\bto taste\b/i.test(line))) continue;
    const cleaned = cleanIngredientLine(line);
    if (cleaned.length < 2) continue;
    unique.add(cleaned);
  }
  return Array.from(unique);
}

function instructionCandidatesFromSection(lines: Array<string>): Array<string> {
  const unique = new Set<string>();
  for (const line of lines) {
    if (/^[A-Za-z ]+:$/.test(line)) continue;
    if (line.length < 8) continue;
    const normalized = normalizeToken(line);
    if (normalized.length > 0) unique.add(normalized);
  }
  return Array.from(unique);
}

function sectionHeaderCandidates(lines: Array<string>): Array<string> {
  const unique = new Set<string>();
  const ignorableHeaders = new Set([
    "directions",
    "direction",
    "instructions",
    "instruction",
    "method",
    "preparation",
    "assembly",
  ]);
  for (const line of lines) {
    if (/^[A-Za-z][A-Za-z ]+:$/.test(line)) {
      const token = normalizeToken(line.replace(/:$/, ""));
      if (!ignorableHeaders.has(token)) {
        unique.add(token);
      }
    }
  }
  return Array.from(unique);
}

function getWordSet(value: string): Set<string> {
  return new Set(
    normalizeToken(value)
      .split(" ")
      .filter((word) => word.length >= 3 && !STOP_WORDS.has(word)),
  );
}

function containsTokenByWords(
  text: string,
  token: string,
  minMatchRatio = 0.6,
): boolean {
  const textWords = getWordSet(text);
  const tokenWords = getWordSet(token);
  if (tokenWords.size === 0) return true;

  let matches = 0;
  for (const word of tokenWords) {
    if (textWords.has(word)) matches += 1;
  }
  const required = Math.max(1, Math.floor(tokenWords.size * minMatchRatio));
  return matches >= required;
}

function splitRecipeSections(inputText: string): {
  ingredientLines: Array<string>;
  instructionLines: Array<string>;
} {
  const lines = splitLines(inputText);
  const directionIndex = lines.findIndex((line) =>
    DIRECTION_MARKER_REGEX.test(line),
  );

  if (directionIndex === -1) {
    return {
      ingredientLines: lines.filter(
        (line) => hasNumericAmountMarker(line) || /\bto taste\b/i.test(line),
      ),
      instructionLines: [],
    };
  }

  return {
    ingredientLines: lines.slice(0, directionIndex),
    instructionLines: lines.slice(directionIndex + 1),
  };
}

export function detectStructuredRecipeInput(inputText: string): boolean {
  const lines = splitLines(inputText);
  if (lines.length < 6) return false;
  const amountLines = lines.filter(
    (line) => hasNumericAmountMarker(line) || /\bto taste\b/i.test(line),
  ).length;
  const hasDirections = lines.some((line) => DIRECTION_MARKER_REGEX.test(line));
  return hasDirections && amountLines >= 3;
}

export function evaluateRecipeImportCompleteness(
  inputText: string,
  generatedRecipe: GeneratedRecipeForValidation,
): CompletenessReport {
  const isStructuredRecipe = detectStructuredRecipeInput(inputText);
  if (!isStructuredRecipe) {
    return {
      isStructuredRecipe: false,
      missingIngredients: [],
      missingStepTokens: [],
      missingSectionTokens: [],
    };
  }

  const { ingredientLines, instructionLines } = splitRecipeSections(inputText);
  const candidateIngredients = ingredientCandidatesFromSection(ingredientLines);
  const candidateSteps = instructionCandidatesFromSection(instructionLines);
  const candidateSections = sectionHeaderCandidates(splitLines(inputText));
  const generatedIngredientText = generatedRecipe.ingredients
    .map((ingredient) => ingredient.name)
    .join(" ");
  const generatedInstructionText = generatedRecipe.instructions.join(" ");
  const generatedAllText = `${generatedIngredientText} ${generatedInstructionText}`;

  const missingIngredients = candidateIngredients.filter(
    (candidate) => !containsTokenByWords(generatedIngredientText, candidate, 0.6),
  );
  const missingStepTokens = candidateSteps.filter(
    (candidate) => !containsTokenByWords(generatedInstructionText, candidate, 0.25),
  );
  const missingSectionTokens = candidateSections.filter(
    (candidate) => !containsTokenByWords(generatedAllText, candidate, 0.5),
  );

  return {
    isStructuredRecipe: true,
    missingIngredients,
    missingStepTokens,
    missingSectionTokens,
  };
}
