/**
 * Headline whose words skew in one after another (CSS only, see `.reveal-word` in globals.css).
 * The text stays real text, so it is selectable and screen readers read it normally.
 */
export function RevealText({
  text,
  delayMs = 0,
  markLast = false,
}: {
  text: string;
  delayMs?: number;
  markLast?: boolean;
}) {
  const words = text.split(" ");
  return (
    <>
      {words.map((word, i) => (
        <span key={i}>
          <span
            className={`reveal-word${markLast && i === words.length - 1 ? " mark" : ""}`}
            style={{ ["--i" as string]: i, ["--d" as string]: `${delayMs}ms` }}
          >
            {word}
          </span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}
