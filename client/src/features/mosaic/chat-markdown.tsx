"use client";

import { Children, isValidElement, useMemo, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function plainText(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") return String(child);
      if (isValidElement<{ children?: ReactNode }>(child)) return plainText(child.props.children);
      return "";
    })
    .join("");
}

function CodeBlock({ children, className }: { children: ReactNode; className?: string }) {
  const language = className?.replace(/^language-/, "") || "";
  const code = plainText(children).replace(/\n$/, "");
  return (
    <pre className="m-md-pre">
      {language ? <span className="m-md-lang">{language}</span> : null}
      <code className={className}>{code}</code>
    </pre>
  );
}

export function ChatMarkdown({ text, className = "" }: { text: string; className?: string }) {
  const source = useMemo(() => text.replace(/\r\n/g, "\n"), [text]);
  if (!source.trim()) return null;

  return (
    <div className={`m-md ${className}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="m-md-p">{children}</p>,
          strong: ({ children }) => <strong className="m-md-strong">{children}</strong>,
          em: ({ children }) => <em className="m-md-em">{children}</em>,
          del: ({ children }) => <del className="m-md-del">{children}</del>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer" className="m-md-link">
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="m-md-list">{children}</ul>,
          ol: ({ children }) => <ol className="m-md-list m-md-ol">{children}</ol>,
          li: ({ children }) => <li className="m-md-li">{children}</li>,
          blockquote: ({ children }) => <blockquote className="m-md-quote">{children}</blockquote>,
          hr: () => <hr className="m-md-hr" />,
          code: ({ className, children, ...props }) => {
            const inline = !String(className || "").includes("language-") && !String(children).includes("\n");
            if (inline) {
              return (
                <code className="m-md-inline" {...props}>
                  {children}
                </code>
              );
            }
            return <CodeBlock className={className}>{children}</CodeBlock>;
          },
          pre: ({ children }) => <>{children}</>,
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
