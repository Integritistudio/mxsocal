import type { ReactNode } from "react";
import type { StoryNode } from "./types";
import s from "./stories.module.css";
const safeHref = (href = "") => /^(https?:\/\/|\/(?!\/))/i.test(href) && !/[\x00-\x20\\]/.test(href) ? href : undefined;
function render(node: StoryNode, key: number): ReactNode {
  const children = node.content?.map((child, index) => render(child, index));
  if (node.type === "text") return <span key={key}>{(node.marks || []).reduce<ReactNode>((text, mark) => {
    if (mark.type === "bold") return <strong>{text}</strong>;
    if (mark.type === "italic") return <em>{text}</em>;
    if (mark.type === "strike") return <s>{text}</s>;
    if (mark.type === "underline") return <u>{text}</u>;
    if (mark.type === "code") return <code>{text}</code>;
    if (mark.type === "link") return <a href={safeHref(mark.attrs?.href)} rel="noopener noreferrer">{text}</a>;
    return text;
  }, node.text || "")}</span>;
  switch (node.type) {
    case "doc": return <div key={key}>{children}</div>;
    case "paragraph": return <p key={key}>{children?.length ? children : <br />}</p>;
    case "heading": return node.attrs?.level === 3 ? <h3 key={key}>{children}</h3> : node.attrs?.level === 4 ? <h4 key={key}>{children}</h4> : <h2 key={key}>{children}</h2>;
    case "bulletList": return <ul key={key}>{children}</ul>;
    case "orderedList": return <ol key={key} start={node.attrs?.start}>{children}</ol>;
    case "listItem": return <li key={key}>{children}</li>;
    case "blockquote": return <blockquote key={key}>{children}</blockquote>;
    case "horizontalRule": return <hr key={key} />;
    case "hardBreak": return <br key={key} />;
    default: return null;
  }
}
export default function StoryContent({ content }: { content?: StoryNode }) { return <div className={s.prose}>{content ? render(content, 0) : null}</div>; }
