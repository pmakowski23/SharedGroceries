import { Link } from "@tanstack/react-router";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

type ErrorFallbackPageProps = {
  error: unknown;
  onTryAgain: () => void;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Something unexpected happened while loading this page.";
}

export function ErrorFallbackPage({ error, onTryAgain }: ErrorFallbackPageProps) {
  const message = getErrorMessage(error);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center justify-center">
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="mb-2 text-4xl">⚠️</div>
            <CardTitle className="text-xl">Something went wrong</CardTitle>
            <CardDescription>
              We could not load this screen right now.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
              {message}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button className="w-full" onClick={onTryAgain}>
              Try again
            </Button>
            <Button asChild className="w-full" variant="secondary">
              <Link to="/">Go to groceries</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
