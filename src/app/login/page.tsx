import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { PatLoginForm } from "@/components/pat-login-form";
import { RocketEarthIcon } from "@/components/rocket-earth-icon";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const CREATE_TOKEN_URL =
  "https://github.com/settings/tokens/new?scopes=repo&description=Deploy+Monitor";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <RocketEarthIcon className="mx-auto size-10" />
          <CardTitle className="text-2xl">Deploy Monitor</CardTitle>
          <CardDescription>
            Sign in with a GitHub{" "}
            <a
              href={CREATE_TOKEN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline underline-offset-2"
            >
              classic personal access token
            </a>{" "}
            (<code className="rounded bg-muted px-1 font-mono">repo</code>{" "}
            scope). It stays in an encrypted cookie on this device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PatLoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
