import { LinkPreview } from "./link-preview";
import { SpoilerGate } from "./spoiler-gate";

export function ContentBody({
  content,
  linkUrl,
  spoiler,
  className,
}: {
  content: string;
  linkUrl: string | null;
  spoiler: string | null;
  className?: string;
}) {
  return (
    <SpoilerGate spoiler={spoiler}>
      {content && (
        <div
          className={className ? `rich-text ${className}` : "rich-text"}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      )}
      {linkUrl && <LinkPreview url={linkUrl} />}
    </SpoilerGate>
  );
}
