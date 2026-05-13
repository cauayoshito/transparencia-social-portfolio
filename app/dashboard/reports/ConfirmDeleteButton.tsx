"use client";

import * as React from "react";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  disabled?: boolean;
  title?: string;
};

export default function ConfirmDeleteButton({
  action,
  disabled,
  title,
}: Props) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (disabled) return;
        const ok = window.confirm(
          "Excluir este relatório? Isso não pode ser desfeito."
        );
        if (!ok) e.preventDefault();
      }}
    >
      <button
        type="submit"
        disabled={disabled}
        title={title}
        className="text-sm text-red-600 hover:underline disabled:opacity-40 disabled:no-underline"
      >
        Excluir
      </button>
    </form>
  );
}
