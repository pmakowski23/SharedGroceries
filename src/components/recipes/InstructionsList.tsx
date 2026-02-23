import { Card, CardContent } from "../ui/card";

type InstructionsListProps = {
  instructions: Array<string>;
};

export function InstructionsList({ instructions }: InstructionsListProps) {
  return (
    <>
      <h2 className="mt-6 mb-3 text-lg font-semibold">Instructions</h2>
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
    </>
  );
}
