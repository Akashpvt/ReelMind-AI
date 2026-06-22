export function Footer() {
  const links = [
    { label: "Features", href: "#features" },
    { label: "Dashboard", href: "#workspace" },
    { label: "Pricing", href: "#pricing" },
    { label: "Start", href: "#workspace" },
  ];
  const socials = ["X", "IG", "YT"];

  return (
    <footer className="relative z-10 border-t border-white/10 px-4 py-10 sm:py-12">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violetGlow/60 to-transparent" />
      <div className="mx-auto max-w-7xl">
        <div className="relative grid gap-8 overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.025] p-5 backdrop-blur-xl sm:p-6 md:grid-cols-[1.2fr_1fr]">
          <div className="pointer-events-none absolute -left-16 bottom-0 h-32 w-32 rounded-full bg-violetGlow/10 blur-3xl" />
          <div className="pointer-events-none absolute right-12 top-0 h-24 w-24 rounded-full bg-cyberBlue/10 blur-3xl" />
          <div>
            <p className="text-lg font-semibold text-frost">ReelMind AI</p>
            <p className="mt-2 max-w-md leading-6 text-mist">From Idea to Viral Reel in Minutes</p>
            <p className="mt-3 text-xs uppercase tracking-[0.22em] text-cyberBlue">Built for creators who move fast</p>
          </div>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-end">
            <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-mist">
              {links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="relative transition duration-300 hover:text-frost"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div className="flex gap-2">
              {socials.map((social) => (
                <button
                  type="button"
                  aria-label={`${social} social placeholder`}
                  key={social}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-xs font-semibold text-mist transition duration-300 hover:-translate-y-0.5 hover:border-cyberBlue/35 hover:bg-cyberBlue/10 hover:text-cyberBlue hover:shadow-blue-glow"
                >
                  {social}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-white/10 pt-5 text-xs text-mist/80 sm:flex-row sm:items-center sm:justify-between">
          <p>Copyright 2026 ReelMind AI. All rights reserved.</p>
          <p>Premium AI reel creation workspace.</p>
        </div>
      </div>
    </footer>
  );
}
