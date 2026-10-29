import * as Atom from "@atom";
import { displayName } from "@/lib/display-name";

type StackPerson = {
  id: number;
  username: string;
  name: string | null;
  avatarUrl: string | null;
};

export function AvatarStack({ people }: { people: StackPerson[] }) {
  return (
    <span className="flex shrink-0 items-center">
      {people.map((person, index) => (
        <span
          key={person.id}
          className={`rounded-full ring-2 ring-surface ${index > 0 ? "-ml-2" : ""}`}
        >
          <Atom.Avatar size="xs" label={displayName(person)} src={person.avatarUrl} seed={person.id} />
        </span>
      ))}
    </span>
  );
}
