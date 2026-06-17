// Renders a synchronous inline script that runs during HTML parsing (before
// first paint) on the server, while staying inert on the client so React
// doesn't warn that "scripts inside React components are never executed when
// rendering on the client." The server emits an executable `text/javascript`
// tag; on the client it renders an inert `text/plain` tag, and
// `suppressHydrationWarning` absorbs the resulting type-attribute mismatch.
// See: Next.js "Preventing Flash Before Hydration".
export default function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
