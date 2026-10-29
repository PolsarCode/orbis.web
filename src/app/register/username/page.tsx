import * as Organism from "@organism";
import * as Template from "@template";

export default function RegisterUsernamePage() {
  return (
    <Organism.GuestGate>
      <Template.AuthTemplate>
        <Organism.OAuthUsernameForm />
      </Template.AuthTemplate>
    </Organism.GuestGate>
  );
}
