import { env } from "@/lib/env";
import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return <SignInForm passphraseRequired={Boolean(env.LOGIN_PASSPHRASE)} />;
}
