"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

/** Tombol submit yang otomatis disabled saat form sedang diproses */
export function SubmitButton({
  children,
  pendingText = "Menyimpan…",
  className = "btn-primary",
}: {
  children: ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingText : children}
    </button>
  );
}

/** Tombol submit dengan konfirmasi (untuk aksi hapus) */
export function ConfirmButton({
  children,
  message,
  className = "text-xs text-muted hover:text-danger",
}: {
  children: ReactNode;
  message: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={className}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

/** Select yang langsung submit form ketika nilainya berubah */
export function AutoSubmitSelect({
  name,
  defaultValue,
  options,
  className = "input",
  ariaLabel,
}: {
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
  className?: string;
  ariaLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      disabled={pending}
      aria-label={ariaLabel}
      className={className}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
