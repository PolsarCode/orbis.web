import * as Organism from "@organism";
import * as Template from "@template";

export default function RegisterPage() {
  return (
    <Organism.GuestGate>
      <Template.AuthTemplate>
        <Organism.AuthForm mode="signup" />
      </Template.AuthTemplate>
    </Organism.GuestGate>
  );
}
