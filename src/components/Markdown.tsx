import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeHighlight from "rehype-highlight";

export default function Markdown({ children }: { children: string }) {
  return (
    <div className="prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeSlug,
          [rehypeAutolinkHeadings, { behavior: "append", properties: { className: "anchor", ariaHidden: true }, content: { type: "text", value: "#" } }],
          [rehypeHighlight, { detect: false, ignoreMissing: true }],
        ]}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
