"use client";

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const fieldCls =
  "rounded-field bg-surface px-4 py-3.5 text-[16px] text-ink placeholder:text-ink-3 outline-none border border-transparent focus:border-ink focus:bg-bg transition";

/** Ширина по умолчанию — на всю строку, но только если вызывающий не задал свою. */
function withWidth(className: string): string {
  return /(^|\s)(w-|flex-1)/.test(className) ? className : `w-full ${className}`;
}

export function Label({ children }: { children: ReactNode }) {
  return <div className="mb-1.5 text-[12px] font-medium text-ink-2">{children}</div>;
}

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldCls} ${withWidth(className)}`} {...rest} />;
}

export function Textarea({ className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${fieldCls} resize-none ${withWidth(className)}`} {...rest} />;
}

export function Select({ className = "", children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select
      className={`${fieldCls} appearance-none bg-no-repeat pr-9 ${withWidth(className)}`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundPosition: "right 14px center",
      }}
      {...rest}
    >
      {children}
    </select>
  );
}

export function FieldGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
