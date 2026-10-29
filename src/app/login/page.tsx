import * as Organism from "@organism";
import * as Template from "@template";

export default function LoginPage() {
  return (
    <Organism.GuestGate>
      <Template.AuthTemplate>
        <Organism.AuthForm mode="login" />
      </Template.AuthTemplate>
    </Organism.GuestGate>
  );
}
