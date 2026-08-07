"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { createAnnotatorAction } from "@/lib/admin-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddAnnotatorDialog() {
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (searchParams.get("created")) {
      setOpen(false);
      setShowPassword(false);
      formRef.current?.reset();
    }
  }, [searchParams]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" className="pos-button-primary">
          <UserPlus className="size-4" />
          Add annotator
        </Button>
      </DialogTrigger>
      <DialogContent className="admin-pos border-[#E6EAED] bg-white">
        <DialogHeader>
          <DialogTitle className="text-[20px] font-bold text-[#212B36]">Add annotator</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={createAnnotatorAction} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#212B36]">Name</Label>
            <Input name="name" required className="pos-input" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#212B36]">Email</Label>
            <Input name="email" type="email" required className="pos-input" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#212B36]">Password</Label>
            <div className="relative">
              <Input name="password" type={showPassword ? "text" : "password"} minLength={6} required className="pos-input pr-11" />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-[8px] text-[#646B72] hover:bg-[#F7F7F7] hover:text-[#092C4C] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/20"
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="pos-button-primary">Create account</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
