import sanitizeHtml from "sanitize-html";

const ARTICLE_TAGS = [
  "a",
  "blockquote",
  "br",
  "code",
  "del",
  "em",
  "figcaption",
  "figure",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
];

export function sanitizeArticleHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ARTICLE_TAGS,
    allowedAttributes: {
      a: ["href", "title"],
      code: ["class"],
      img: ["alt", "height", "loading", "src", "title", "width"],
      li: ["value"],
      ol: ["start"],
      td: ["align", "colspan", "rowspan"],
      th: ["align", "colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      a: ["http", "https", "mailto"],
      img: ["http", "https"],
    },
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    enforceHtmlBoundary: true,
  });
}
