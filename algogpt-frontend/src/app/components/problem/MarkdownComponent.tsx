// Markdown packages
import { Components } from "react-markdown";
import React, { DetailedHTMLProps, HTMLAttributes } from "react";
import "katex/dist/katex.min.css";

/** ---------------------------
 *  Custom Markdown Components
 * --------------------------- */
type MarkdownComponentProps<T extends HTMLElement> = DetailedHTMLProps<
  HTMLAttributes<T>,
  T
>;

type CodeProps = React.HTMLAttributes<HTMLElement> & {
  inline?: boolean;
  children?: React.ReactNode;
};

export const MarkdownComponents: Components = {
  code: ({ inline, children, ...props }: CodeProps) => {
    if (inline) {
      return (
        <code
          className="
            bg-gray-100 
            text-gray-900
            font-mono
            text-sm
            px-1
            py-[2px]
            rounded-md
            whitespace-nowrap
            align-middle
            border
            border-gray-200
          "
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <span className="inline-block">
        <pre className="bg-gray-100 text-gray-900 rounded-md px-2 py-[2px] font-mono text-sm">
          <code {...props}>{children}</code>
        </pre>
      </span>
    );
  },

  p: ({ children, ...props }: MarkdownComponentProps<HTMLParagraphElement>) => (
    <p 
      className="
        text-base 
        leading-7 
        mb-4
        [&_code]:align-middle
        [&_code]:relative
        [&_code]:top-[-1px]
      " 
      {...props}
    >
      {children}
    </p>
  ),

  pre: ({ children, ...props }: MarkdownComponentProps<HTMLPreElement>) => (
    <span className="inline-block" {...props}>
      {children}
    </span>
  )
};