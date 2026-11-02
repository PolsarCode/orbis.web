import * as Atom from "@atom";
import * as Molecule from "@molecule";

type JoinCommunityPromptProps = {
  guest?: boolean;
  banned?: boolean;
  description?: string | null;
  joining: boolean;
  error: string | null;
  onJoin: () => void;
};

export function JoinCommunityPrompt({
  guest = false,
  banned = false,
  description,
  joining,
  error,
  onJoin,
}: JoinCommunityPromptProps) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-divider bg-surface p-5 sm:p-6">
      {description && (
        <p className="whitespace-pre-wrap text-sm">{description}</p>
      )}
      <div className={description ? "border-t border-divider pt-4" : undefined}>
        <h2 className="font-display text-xl font-bold">
          {banned ? "You can’t join this community" : "Join to participate"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {banned
            ? "You can still read what’s public here."
            : guest
              ? "Log in to join this community, post, comment, and take part in discussions."
              : "Join this community to post, comment, and take part in discussions."}
        </p>
      </div>
      {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
      {!banned && (
        <div>
          {guest ? (
            <Molecule.LoginLink>Log in to join</Molecule.LoginLink>
          ) : (
            <Molecule.ReadOnlyGate action="join">
              <Atom.Button loading={joining} onClick={onJoin}>
                Join community
              </Atom.Button>
            </Molecule.ReadOnlyGate>
          )}
        </div>
      )}
    </section>
  );
}
