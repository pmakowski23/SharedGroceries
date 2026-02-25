import { Card, CardContent } from "../ui/card";

type InstructionsListProps = {
  instructions: Array<string>;
  parts?: Array<{
    _id: string;
    name: string;
    instructions: Array<string>;
  }>;
};

export function InstructionsList({ instructions, parts = [] }: InstructionsListProps) {
  const hasPartInstructions = parts.some((part) => part.instructions.length > 0);
  return (
    <>
      <h2 className="mt-6 mb-3 text-lg font-semibold">Instructions</h2>
      {hasPartInstructions ? (
        <div className="space-y-4">
          {parts
            .filter((part) => part.instructions.length > 0)
            .map((part) => (
              <div key={part._id}>
                <h3 className="mb-2 text-sm font-semibold text-foreground">{part.name}</h3>
                <ol className="space-y-3">
                  {part.instructions.map((step, index) => (
                    <li key={`${part._id}-${index}`}>
                      <Card>
                        <CardContent className="flex gap-3 p-4">
                          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                            {index + 1}
                          </span>
                          <p className="text-sm leading-relaxed text-muted-foreground">{step}</p>
                        </CardContent>
                      </Card>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
        </div>
      ) : (
        <ol className="space-y-3">
          {instructions.map((step, index) => (
            <li key={index}>
              <Card>
                <CardContent className="flex gap-3 p-4">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
