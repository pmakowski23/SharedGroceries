type PlanningProfile = {
  targetKcal?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
  macroTolerancePct?: number;
  dietPreference?: string;
  excludeBeef?: boolean;
  excludePork?: boolean;
  excludeSeafood?: boolean;
  excludeDairy?: boolean;
  excludeEggs?: boolean;
  excludeGluten?: boolean;
  excludeNuts?: boolean;
  preferenceNotes?: string;
};

const beefKeywords = ["beef", "steak", "mince", "burger", "meatball"];
const porkKeywords = ["pork", "bacon", "ham", "prosciutto", "sausage"];
const seafoodKeywords = [
  "salmon",
  "tuna",
  "cod",
  "shrimp",
  "prawn",
  "mussel",
  "anchovy",
  "fish",
];
const dairyKeywords = [
  "milk",
  "cream",
  "cheese",
  "butter",
  "yogurt",
  "mozzarella",
  "parmesan",
];
const eggKeywords = ["egg", "eggs", "mayonnaise", "mayo"];
const glutenKeywords = ["wheat", "pasta", "bread", "bun", "flour", "soy sauce"];
const nutKeywords = ["almond", "cashew", "peanut", "pecan", "walnut", "hazelnut"];
const meatKeywords = [...beefKeywords, ...porkKeywords, "chicken", "turkey", "lamb"];
const allAnimalKeywords = [
  ...meatKeywords,
  ...seafoodKeywords,
  ...dairyKeywords,
  ...eggKeywords,
  "honey",
];
const vegetarianAnimalKeywords = [
  ...meatKeywords,
  ...seafoodKeywords,
  "gelatin",
];

function countMatches(haystack: string, keywords: string[]) {
  return keywords.reduce(
    (count, keyword) => (haystack.includes(keyword) ? count + 1 : count),
    0,
  );
}

function toSearchText(parts: string[]) {
  return parts.join(" ").toLowerCase();
}

export function aggregateFamilyPlanningContext(profiles: PlanningProfile[]) {
  const membersWithTargets = profiles.filter(
    (profile) =>
      profile.targetKcal !== undefined &&
      profile.targetProtein !== undefined &&
      profile.targetCarbs !== undefined &&
      profile.targetFat !== undefined,
  );
  const veganVotes = profiles.filter(
    (profile) =>
      profile.dietPreference === "vegan" ||
      profile.dietPreference === "moreVegan",
  ).length;
  const vegetarianVotes = profiles.filter(
    (profile) =>
      profile.dietPreference === "vegetarian" ||
      profile.dietPreference === "moreVegetarian",
  ).length;

  return {
    memberCount: profiles.length,
    membersWithTargets: membersWithTargets.length,
    targets:
      membersWithTargets.length > 0
        ? {
            kcal: membersWithTargets.reduce(
              (sum, profile) => sum + (profile.targetKcal ?? 0),
              0,
            ),
            protein: membersWithTargets.reduce(
              (sum, profile) => sum + (profile.targetProtein ?? 0),
              0,
            ),
            carbs: membersWithTargets.reduce(
              (sum, profile) => sum + (profile.targetCarbs ?? 0),
              0,
            ),
            fat: membersWithTargets.reduce(
              (sum, profile) => sum + (profile.targetFat ?? 0),
              0,
            ),
            macroTolerancePct: profiles.reduce(
              (max, profile) => Math.max(max, profile.macroTolerancePct ?? 5),
              5,
            ),
          }
        : null,
    hardExclusions: {
      beef: profiles.some((profile) => profile.excludeBeef),
      pork: profiles.some((profile) => profile.excludePork),
      seafood: profiles.some((profile) => profile.excludeSeafood),
      dairy: profiles.some((profile) => profile.excludeDairy),
      eggs: profiles.some((profile) => profile.excludeEggs),
      gluten: profiles.some((profile) => profile.excludeGluten),
      nuts: profiles.some((profile) => profile.excludeNuts),
      vegetarian: profiles.some(
        (profile) => profile.dietPreference === "vegetarian",
      ),
      vegan: profiles.some((profile) => profile.dietPreference === "vegan"),
    },
    softPreferenceWeight: veganVotes * 2 + vegetarianVotes,
    veganVotes,
    vegetarianVotes,
    notes: profiles
      .map((profile) => profile.preferenceNotes?.trim())
      .filter((value): value is string => Boolean(value)),
  };
}

export function buildFamilyGoalsContext(profiles: PlanningProfile[]) {
  const aggregate = aggregateFamilyPlanningContext(profiles);
  const lines: string[] = [
    `- Household members: ${aggregate.memberCount}`,
    `- Members with targets: ${aggregate.membersWithTargets}`,
  ];

  if (aggregate.targets) {
    lines.push(`- Household daily target kcal: ${aggregate.targets.kcal}`);
    lines.push(
      `- Household daily protein target: ${aggregate.targets.protein} g`,
    );
    lines.push(
      `- Household daily carbs target: ${aggregate.targets.carbs} g`,
    );
    lines.push(`- Household daily fat target: ${aggregate.targets.fat} g`);
    lines.push(
      `- Macro tolerance: ${aggregate.targets.macroTolerancePct}%`,
    );
  }

  const exclusions = [
    aggregate.hardExclusions.vegan ? "vegan only" : null,
    !aggregate.hardExclusions.vegan && aggregate.hardExclusions.vegetarian
      ? "vegetarian only"
      : null,
    aggregate.hardExclusions.beef ? "no beef" : null,
    aggregate.hardExclusions.pork ? "no pork" : null,
    aggregate.hardExclusions.seafood ? "no seafood" : null,
    aggregate.hardExclusions.dairy ? "no dairy" : null,
    aggregate.hardExclusions.eggs ? "no eggs" : null,
    aggregate.hardExclusions.gluten ? "no gluten" : null,
    aggregate.hardExclusions.nuts ? "no nuts" : null,
  ].filter((value): value is string => value !== null);

  if (exclusions.length > 0) {
    lines.push(`- Hard exclusions: ${exclusions.join(", ")}`);
  }
  if (aggregate.veganVotes > 0) {
    lines.push(`- Soft preference votes for more vegan meals: ${aggregate.veganVotes}`);
  }
  if (aggregate.vegetarianVotes > 0) {
    lines.push(
      `- Soft preference votes for more vegetarian meals: ${aggregate.vegetarianVotes}`,
    );
  }
  if (aggregate.notes.length > 0) {
    lines.push(`- Additional notes: ${aggregate.notes.join(" | ")}`);
  }

  return `Family meal planning context:\n${lines.join("\n")}`;
}

export function recipeViolatesFamilyPreferences(
  textParts: string[],
  profiles: PlanningProfile[],
) {
  const aggregate = aggregateFamilyPlanningContext(profiles);
  const text = toSearchText(textParts);

  if (aggregate.hardExclusions.vegan) {
    return countMatches(text, allAnimalKeywords) > 0;
  }
  if (aggregate.hardExclusions.vegetarian) {
    return countMatches(text, vegetarianAnimalKeywords) > 0;
  }
  if (aggregate.hardExclusions.beef && countMatches(text, beefKeywords) > 0) {
    return true;
  }
  if (aggregate.hardExclusions.pork && countMatches(text, porkKeywords) > 0) {
    return true;
  }
  if (
    aggregate.hardExclusions.seafood &&
    countMatches(text, seafoodKeywords) > 0
  ) {
    return true;
  }
  if (aggregate.hardExclusions.dairy && countMatches(text, dairyKeywords) > 0) {
    return true;
  }
  if (aggregate.hardExclusions.eggs && countMatches(text, eggKeywords) > 0) {
    return true;
  }
  if (
    aggregate.hardExclusions.gluten &&
    countMatches(text, glutenKeywords) > 0
  ) {
    return true;
  }
  if (aggregate.hardExclusions.nuts && countMatches(text, nutKeywords) > 0) {
    return true;
  }
  return false;
}

export function recipePreferencePenalty(
  textParts: string[],
  profiles: PlanningProfile[],
) {
  const aggregate = aggregateFamilyPlanningContext(profiles);
  if (aggregate.softPreferenceWeight === 0) {
    return 0;
  }

  const text = toSearchText(textParts);
  const animalSignals = countMatches(text, allAnimalKeywords);
  const plantSignals = countMatches(text, [
    "tofu",
    "lentil",
    "bean",
    "chickpea",
    "vegetable",
    "mushroom",
    "quinoa",
  ]);

  return Math.max(0, animalSignals * 0.12 * aggregate.softPreferenceWeight - plantSignals * 0.05);
}
