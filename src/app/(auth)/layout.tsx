import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-hatch grid min-h-dvh place-items-center px-4 py-12">
      <div aria-hidden className="bg-brand fixed inset-x-0 top-0 h-1" />
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        {children}
      </div>
    </div>
  );
}
