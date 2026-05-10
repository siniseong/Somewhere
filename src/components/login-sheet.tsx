"use client";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { signInWithKakao } from "@/lib/auth";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LoginSheet({ open, onOpenChange }: Props) {
  async function handleStart() {
    await signInWithKakao();
    // signInWithKakao redirects to Kakao; on return /auth/callback handles session
    onOpenChange(false);
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>로그인이 필요해요</DrawerTitle>
          <DrawerDescription>
            팀을 만들거나 기록을 남기려면 카카오 로그인이 필요해요.
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-5 pb-2 pt-5">
          <button
            type="button"
            onClick={handleStart}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FEE500] py-[14px] text-[15px] font-semibold text-[#191600] shadow-[0_8px_24px_rgba(254,229,0,0.15)] active:scale-[0.98]"
          >
            <svg
              width="18"
              height="17"
              viewBox="0 0 18 17"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M9 0C4.03 0 0 3.13 0 7c0 2.5 1.65 4.7 4.13 5.95-.18.66-.66 2.41-.76 2.78-.12.47.17.46.36.34.15-.1 2.4-1.63 3.37-2.29.62.09 1.25.14 1.9.14 4.97 0 9-3.13 9-7s-4.03-7-9-7z"
                fill="#191600"
              />
            </svg>
            카카오로 시작하기
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
