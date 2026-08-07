"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

function validColor(value?: string | null) {
  return /^#[0-9a-fA-F]{6}$/.test(value ?? "") ? value! : "#0D6EFD";
}

export function ColorPickerField({ name = "colorHex", defaultValue, form, label }: { name?: string; defaultValue?: string | null; form?: string; label: string }) {
  const [value, setValue] = useState(validColor(defaultValue));

  return (
    <div className="flex min-w-52 items-center gap-2">
      <input
        aria-label={label}
        type="color"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="h-[38px] w-12 cursor-pointer rounded-[5.6px] border border-[#E6EAED] bg-white p-1"
      />
      <Input form={form} name={name} value={value} onChange={(event) => setValue(event.target.value)} className="pos-input w-32" />
    </div>
  );
}
