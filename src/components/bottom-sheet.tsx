"use client";

import { Drawer } from "vaul";
import type { ReactNode } from "react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

export function BottomSheet({ open, onOpenChange, children }: Props) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-30 bg-black/40" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-h-[88dvh] w-full max-w-[440px] flex-col rounded-t-[28px] bg-[#0a0a0a] outline-none ring-1 ring-white/10">
          <Drawer.Title className="sr-only">기록</Drawer.Title>
          <Drawer.Description className="sr-only">
            기록 디테일
          </Drawer.Description>
          <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-white/15" />
          <div className="flex-1 overflow-y-auto px-5 pb-8 pt-4">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
