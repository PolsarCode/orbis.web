import type { Metadata } from "next";
import * as Organism from "@organism";
import * as Template from "@template";

export const metadata: Metadata = { title: "Sign up" };

export default function RegisterPage() {
  return (
    <Organism.GuestGate>
      <Template.AuthTemplate>
        <Organism.AuthForm mode="signup" />
      </Template.AuthTemplate>
    </Organism.GuestGate>
  );
}
