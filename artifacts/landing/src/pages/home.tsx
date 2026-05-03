export default function Home() {
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white overflow-x-hidden">
      <Nav />
      <Hero />
      <Features />
      <HowItWorks />
      <Tracks />
      <TutorCTA />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 bg-[#0D0D0D]/80 backdrop-blur-md border-b border-white/5">
      <div className="flex items-center gap-2">
        <img src={`${import.meta.env.BASE_URL}zero-club-logo.png`} alt="Zero Club" className="w-8 h-8 rounded-xl object-cover" />
        <span className="font-bold text-white text-base tracking-tight">Zero Club</span>
      </div>
      <nav className="hidden md:flex items-center gap-7 text-sm text-white/60">
        <a href="#features" className="hover:text-white transition-colors">Features</a>
        <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
        <a href="#tracks" className="hover:text-white transition-colors">Tracks</a>
        <a href="#tutors" className="hover:text-white transition-colors">Become a Tutor</a>
      </nav>
      <a
        href="/admin"
        className="text-sm px-4 py-2 rounded-lg bg-indigo-500 text-white font-medium hover:bg-indigo-400 transition-colors"
      >
        Tutor Portal
      </a>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative pt-36 pb-24 px-6 md:px-12 flex flex-col items-center text-center overflow-hidden">
      {/* Glow blobs */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-40 left-1/4 w-[300px] h-[300px] bg-purple-500/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-3xl">
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          Now accepting tutor applications
        </span>

        <h1 className="text-4xl md:text-6xl font-black leading-tight tracking-tight">
          Level up your skills.{" "}
          <span className="text-indigo-400">Earn while you learn.</span>
        </h1>

        <p className="text-lg md:text-xl text-white/55 max-w-xl leading-relaxed">
          Zero Club is the premium skills platform for African tech creatives.
          Complete bootcamps, earn XP, collect zero proofs, and withdraw real cash rewards.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
          <a
            href="#how-it-works"
            className="px-7 py-3 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-400 transition-colors shadow-lg shadow-indigo-500/25"
          >
            See how it works
          </a>
          <a
            href="#tracks"
            className="px-7 py-3 rounded-xl bg-white/8 text-white font-semibold text-sm hover:bg-white/12 transition-colors border border-white/10"
          >
            Browse tracks
          </a>
        </div>

        {/* App preview illustration */}
        <div className="mt-14 relative w-[280px] mx-auto">
          <div className="w-[220px] mx-auto rounded-[36px] bg-[#1A1A1A] border border-white/10 shadow-2xl overflow-hidden aspect-[9/19]">
            <div className="h-full bg-gradient-to-b from-[#1A1A1A] to-[#111] flex flex-col">
              {/* Status bar */}
              <div className="flex justify-between items-center px-6 pt-4 pb-2">
                <span className="text-xs text-white/40">9:41</span>
                <div className="w-14 h-4 bg-black rounded-full" />
                <div className="flex gap-1 items-center">
                  <span className="text-xs text-white/40">●●●</span>
                </div>
              </div>
              {/* App content */}
              <div className="flex-1 flex flex-col px-4 gap-3 overflow-hidden pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-white/40">Welcome back,</p>
                    <p className="text-sm font-bold text-white">Zero Builder</p>
                  </div>
                  <img src={`${import.meta.env.BASE_URL}zero-club-logo.png`} alt="" className="w-8 h-8 rounded-full object-cover" />
                </div>
                {/* XP card */}
                <div className="rounded-2xl bg-indigo-500/15 border border-indigo-500/20 p-3">
                  <p className="text-[9px] text-indigo-300 mb-1">Your XP Balance</p>
                  <p className="text-xl font-black text-amber-400">XP Balance</p>
                  <div className="mt-2 h-1 rounded-full bg-white/10">
                    <div className="h-full w-3/5 rounded-full bg-indigo-500" />
                  </div>
                  <p className="text-[8px] text-white/30 mt-1">Keep completing modules to level up</p>
                </div>
                {/* Bootcamp cards */}
                {[
                  { title: "Your active bootcamp", tag: "Video", color: "#6366F1" },
                  { title: "Next on your path", tag: "Live", color: "#10B981" },
                ].map((c) => (
                  <div key={c.title} className="rounded-xl bg-[#242424] border border-white/5 p-3 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ background: `${c.color}25` }}>
                      <div className="w-full h-full rounded-lg" style={{ background: `linear-gradient(135deg, ${c.color}40, transparent)` }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-white truncate">{c.title}</p>
                      <span className="text-[8px] text-white/40">{c.tag}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Floating badges */}
          <div className="absolute -right-8 top-16 bg-[#1A1A1A] border border-white/10 rounded-2xl px-3 py-2 shadow-xl">
            <p className="text-[10px] text-white/40">Cash Rewards</p>
            <p className="text-sm font-black text-amber-400">Withdraw anytime</p>
          </div>
          <div className="absolute -left-10 bottom-20 bg-[#1A1A1A] border border-white/10 rounded-2xl px-3 py-2 shadow-xl">
            <p className="text-[10px] text-white/40">Zero Proofs</p>
            <p className="text-sm font-black text-indigo-400">Earn badges</p>
          </div>
        </div>
      </div>
    </section>
  );
}

const features = [
  {
    icon: "🎓",
    title: "Premium Bootcamps",
    desc: "Structured, expert-led programs in product design, engineering, and creative skills — built for African talent.",
  },
  {
    icon: "⚡",
    title: "XP & Levelling System",
    desc: "Earn experience points for every module you complete. Level up your profile and unlock higher-tier bootcamps.",
  },
  {
    icon: "🏅",
    title: "Zero Proofs",
    desc: "Certifiable proof-of-skill badges attached to your profile. Show employers and clients real evidence of your abilities.",
  },
  {
    icon: "💸",
    title: "Real Cash Rewards",
    desc: "Convert your XP balance into naira and withdraw directly to your bank account or mobile wallet.",
  },
  {
    icon: "🤝",
    title: "Peer Community",
    desc: "Learn alongside a tight community of builders, designers, and founders working on real projects.",
  },
  {
    icon: "📱",
    title: "Mobile-First",
    desc: "Learn on the go. Our Expo-powered app delivers smooth, native-quality experiences on Android and iOS.",
  },
];

function Features() {
  return (
    <section id="features" className="px-6 md:px-12 py-24 max-w-6xl mx-auto">
      <div className="text-center mb-14">
        <h2 className="text-3xl md:text-4xl font-black mb-3">Everything you need to grow</h2>
        <p className="text-white/50 max-w-xl mx-auto">
          Zero Club combines structured learning, gamification, and real financial incentives — all in one place.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
        {features.map((f) => (
          <div key={f.title} className="rounded-2xl bg-[#1A1A1A] border border-white/5 p-6 hover:border-indigo-500/30 transition-colors">
            <span className="text-2xl mb-4 block">{f.icon}</span>
            <h3 className="font-bold text-white mb-2">{f.title}</h3>
            <p className="text-sm text-white/45 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const steps = [
  { num: "01", title: "Create your account", desc: "Sign up on the mobile app, pick your learning track, and set up your Zero Club profile in under 2 minutes." },
  { num: "02", title: "Enrol in a bootcamp", desc: "Browse curated bootcamps by track and difficulty. Free and paid options available for every level." },
  { num: "03", title: "Complete modules", desc: "Work through video, live, or text-based modules at your own pace. Each completion earns you XP." },
  { num: "04", title: "Earn & withdraw", desc: "Accumulate XP, collect Zero Proof badges, and withdraw your cash rewards straight to your wallet." },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="px-6 md:px-12 py-24 bg-[#111]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-black mb-3">Simple. Proven. Rewarding.</h2>
          <p className="text-white/50 max-w-lg mx-auto">Four steps from zero to certified and paid.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <div key={s.num} className="relative">
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-5 left-[calc(100%+12px)] right-0 h-px bg-indigo-500/20 w-8" />
              )}
              <div className="rounded-2xl bg-[#1A1A1A] border border-white/5 p-5 h-full">
                <span className="text-xs font-black text-indigo-400 mb-3 block">{s.num}</span>
                <h3 className="font-bold text-white text-sm mb-2">{s.title}</h3>
                <p className="text-xs text-white/45 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const tracks = [
  { name: "Product Design", icon: "🎨" },
  { name: "Frontend Dev", icon: "💻" },
  { name: "Backend Dev", icon: "⚙️" },
  { name: "Full Stack", icon: "🚀" },
  { name: "Branding", icon: "✨" },
  { name: "Motion Design", icon: "🎬" },
  { name: "Growth", icon: "📈" },
  { name: "Vibe Coding", icon: "🎵" },
];

function Tracks() {
  return (
    <section id="tracks" className="px-6 md:px-12 py-24 max-w-6xl mx-auto">
      <div className="text-center mb-14">
        <h2 className="text-3xl md:text-4xl font-black mb-3">Pick your track</h2>
        <p className="text-white/50 max-w-lg mx-auto">
          From design to engineering to growth — we have structured paths for every creative discipline.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {tracks.map((t) => (
          <div
            key={t.name}
            className="rounded-2xl bg-[#1A1A1A] border border-white/5 p-5 flex flex-col items-center text-center gap-2 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all cursor-pointer"
          >
            <span className="text-3xl">{t.icon}</span>
            <p className="font-semibold text-white text-sm">{t.name}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TutorCTA() {
  return (
    <section id="tutors" className="px-6 md:px-12 py-24 bg-[#111]">
      <div className="max-w-4xl mx-auto rounded-3xl bg-gradient-to-br from-indigo-500/15 to-purple-500/10 border border-indigo-500/20 p-10 md:p-14 flex flex-col md:flex-row items-start md:items-center gap-8">
        <div className="flex-1">
          <span className="inline-block px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-medium mb-4">
            For educators
          </span>
          <h2 className="text-2xl md:text-3xl font-black mb-3">Are you an expert in your field?</h2>
          <p className="text-white/55 leading-relaxed max-w-md">
            Share your knowledge on Zero Club and reach thousands of ambitious African learners.
            Verified tutors earn revenue from enrolments and build their reputation on the continent's
            most skill-focused platform.
          </p>
          <ul className="mt-5 space-y-2">
            {["Set your own bootcamp curriculum", "Earn from every student enrollment", "Get verified tutor badge & profile", "Access analytics on your learners"].map((b) => (
              <li key={b} className="flex items-center gap-2 text-sm text-white/70">
                <span className="text-indigo-400 font-bold">✓</span>
                {b}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex-shrink-0">
          <a
            href="/admin"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-400 transition-colors shadow-lg shadow-indigo-500/25"
          >
            Apply as a Tutor
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <p className="text-xs text-white/30 mt-3 text-center">Free to apply. Reviewed within 48h.</p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="px-6 md:px-12 py-10 border-t border-white/5">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <img src={`${import.meta.env.BASE_URL}zero-club-logo.png`} alt="Zero Club" className="w-7 h-7 rounded-lg object-cover" />
          <span className="font-bold text-white/70 text-sm">Zero Club</span>
        </div>
        <p className="text-xs text-white/25">© {new Date().getFullYear()} Zero Club. Built for African creatives.</p>
        <div className="flex gap-5 text-xs text-white/35">
          <a href="/admin" className="hover:text-white transition-colors">Tutor Portal</a>
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#tracks" className="hover:text-white transition-colors">Tracks</a>
        </div>
      </div>
    </footer>
  );
}
