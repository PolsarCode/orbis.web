import type { Metadata } from "next";
import * as Organism from "@organism";
import * as Template from "@template";

export const metadata: Metadata = { title: "Choose a username" };

export default function RegisterUsernamePage() {
  return (
    <Organism.GuestGate>
      <Template.AuthTemplate>
        <Organism.OAuthUsernameForm />
      </Template.AuthTemplate>
    </Organism.GuestGate>
  );
}
