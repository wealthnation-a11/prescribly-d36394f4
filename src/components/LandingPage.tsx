import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

/**
 * New Prescribly landing page — faithfully ported from the approved
 * design brief. Self-contained: fonts + styles + scripts scoped here.
 */
export const LandingPage = () => {
  const heroRef = useRef<HTMLElement | null>(null);
  const spotlightRef = useRef<HTMLDivElement | null>(null);
  const phoneTiltRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  // Preload Google fonts
  useEffect(() => {
    const links: HTMLLinkElement[] = [];
    const add = (href: string, rel = "stylesheet") => {
      const l = document.createElement("link");
      l.rel = rel;
      l.href = href;
      if (rel === "preconnect") l.crossOrigin = "";
      document.head.appendChild(l);
      links.push(l);
    };
    add("https://fonts.googleapis.com", "preconnect");
    add("https://fonts.gstatic.com", "preconnect");
    add(
      "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500&family=Space+Grotesk:wght@400;500;600;700&display=swap"
    );
    return () => links.forEach((l) => l.parentNode?.removeChild(l));
  }, []);

  // Reveal on scroll + header shadow + progress + spotlight/tilt
  useEffect(() => {
    const revealEls = document.querySelectorAll(".prb-reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("in");
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach((el) => io.observe(el));

    const onScroll = () => {
      const scrolled =
        (document.documentElement.scrollTop /
          (document.documentElement.scrollHeight -
            document.documentElement.clientHeight)) *
        100;
      if (progressRef.current) progressRef.current.style.width = `${scrolled}%`;
      if (headerRef.current)
        headerRef.current.classList.toggle("scrolled", window.scrollY > 20);
    };
    window.addEventListener("scroll", onScroll);

    const hero = heroRef.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const onMove = (e: MouseEvent) => {
      if (!hero || reduce) return;
      const rect = hero.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * 100;
      const my = ((e.clientY - rect.top) / rect.height) * 100;
      if (spotlightRef.current) {
        spotlightRef.current.style.setProperty("--mx", `${mx}%`);
        spotlightRef.current.style.setProperty("--my", `${my}%`);
      }
      if (phoneTiltRef.current) {
        const tiltX = ((e.clientY - rect.top - rect.height / 2) / rect.height) * 10;
        const tiltY = ((e.clientX - rect.left - rect.width / 2) / rect.width) * -10;
        phoneTiltRef.current.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
      }
    };
    const onLeave = () => {
      if (phoneTiltRef.current) phoneTiltRef.current.style.transform = "";
    };
    hero?.addEventListener("mousemove", onMove);
    hero?.addEventListener("mouseleave", onLeave);

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      hero?.removeEventListener("mousemove", onMove);
      hero?.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div className="prb-root">
      <style>{PRB_CSS}</style>

      <div className="prb-bg-atmosphere">
        <span className="b1" />
        <span className="b2" />
        <span className="b3" />
      </div>
      <div className="prb-progress-bar" ref={progressRef} />

      <header id="prb-header" ref={headerRef}>
        <nav>
          <Link to="/" className="prb-logo">
            <LogoMark />
            Prescribly
          </Link>
          <div className="prb-nav-links">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#showcase">More</a>
            <a href="#reach">Reach</a>
            <a href="#doctors">For doctors</a>
          </div>
          <div className="prb-nav-cta">
            <Link to="/login" className="prb-btn prb-btn-ghost" style={{ padding: "10px 20px", fontSize: 14 }}>
              Log in
            </Link>
            <Link to="/register" className="prb-btn prb-btn-primary" style={{ padding: "10px 22px", fontSize: 14 }}>
              Get started
            </Link>
          </div>
        </nav>
      </header>

      <section className="prb-hero" ref={heroRef}>
        <div id="prb-spotlight" ref={spotlightRef} />
        <div className="prb-wrap prb-hero-grid" style={{ position: "relative", zIndex: 1 }}>
          <div>
            <span className="prb-eyebrow">Africa's healthcare operating system</span>
            <h1>
              Your doctor,<br />
              always in your <em className="prb-grad-text">pocket</em>.
            </h1>
            <p className="prb-lead">
              Prescribly pairs instant AI symptom triage with licensed Nigerian doctors — so care starts the moment you
              need it, not weeks later.
            </p>
            <div className="prb-hero-ctas">
              <Link to="/register" className="prb-btn prb-btn-primary">
                Start a consultation →
              </Link>
              <a href="#how" className="prb-btn prb-btn-ghost">
                See how it works
              </a>
            </div>
            <div className="prb-hero-trust">
              <div className="prb-avatars">
                <span /><span /><span /><span />
              </div>
              <span>
                Every consultation is handled by a real, MDCN-licensed doctor — never a chatbot pretending to be one.
              </span>
            </div>
          </div>
          <div className="prb-phone-stage">
            <div className="prb-badge-float badge-1">🩺 Doctor matched in &lt; 3 min</div>
            <div className="prb-phone-tilt" ref={phoneTiltRef} style={{ perspective: 1000 }}>
              <div className="prb-phone">
                <div className="prb-phone-notch" />
                <div className="prb-phone-screen">
                  <div className="prb-phone-topbar">
                    <div className="dot">🤖</div>
                    <div className="who">
                      <b>Prescribly AI</b>
                      <span><span className="prb-status-dot" />Online now</span>
                    </div>
                  </div>
                  <div className="prb-chat-body">
                    <div className="prb-bubble me b1">I've had a fever and headache since last night</div>
                    <div className="prb-bubble ai b2">Thanks — on a scale of 1–10, how severe is the headache?</div>
                    <div className="prb-bubble me b3">About a 7. Started after I got back from Kano</div>
                    <div className="prb-typing"><i /><i /><i /></div>
                    <div className="prb-bubble them b4">Connecting you to Dr. Amaka — available now for video or chat.</div>
                  </div>
                  <div className="prb-phone-footer"><div className="pill" /><div className="send" /></div>
                </div>
              </div>
            </div>
            <div className="prb-badge-float badge-2">🔒 Private &amp; confidential</div>
          </div>
        </div>
      </section>

      <div className="prb-pillars-band">
        <div className="prb-wrap prb-pillars-grid">
          {[
            {
              n: "Real doctors",
              h: "Not chatbots wearing a stethoscope",
              p: "Every consultation is reviewed or handled by a licensed Nigerian doctor — AI narrows things down, it never diagnoses alone.",
            },
            {
              n: "Minutes, not weeks",
              h: "Care that starts the moment you ask",
              p: "No queues, no referral letters, no waiting rooms. Describe what's wrong and get matched right away.",
            },
            {
              n: "Built here, for here",
              h: "Designed around Nigerian healthcare",
              p: "From pricing to specialties to the way symptoms are described — built around how care actually works in Nigeria.",
            },
          ].map((p, i) => (
            <div key={p.n} className="prb-pillar prb-reveal" style={{ ["--d" as any]: i }}>
              <span className="pnum">{p.n}</span>
              <h3>{p.h}</h3>
              <p>{p.p}</p>
            </div>
          ))}
        </div>
      </div>

      <section id="how">
        <div className="prb-wrap">
          <div className="prb-sec-head prb-reveal">
            <span className="prb-eyebrow">How it works</span>
            <h2>From symptom to prescription, in one thread.</h2>
          </div>
          <div className="prb-flow">
            <div className="prb-flow-line">
              <svg viewBox="0 0 1000 6" preserveAspectRatio="none">
                <path d="M0,3 L1000,3" />
              </svg>
            </div>
            <div className="prb-flow-steps">
              {[
                { i: "01", t: "Tell us what's wrong", p: "Describe symptoms in plain language, right in the app. No forms, no medical jargon to decode." },
                { i: "02", t: "Get matched to a doctor", p: "Our AI triage narrows things down, then hands you to a licensed doctor from our verified network — video or chat, day or night." },
                { i: "03", t: "Follow through", p: "Prescriptions and reminders follow up automatically, so nothing falls through the cracks before your next visit." },
              ].map((s, i) => (
                <div key={s.i} className="prb-step prb-reveal" style={{ ["--d" as any]: i }}>
                  <span className="idx">{s.i}</span>
                  <div className="prb-step-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M4 4H20V16H8L4 20V4Z" stroke="#023E8A" strokeWidth="1.8" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <h3>{s.t}</h3>
                  <p>{s.p}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="prb-features-band">
        <div className="prb-wrap">
          <div className="prb-sec-head prb-reveal">
            <span className="prb-eyebrow">Built around you</span>
            <h2>Everything a patient needs, none of the clutter.</h2>
          </div>
          <div className="prb-feat-grid">
            <FeatCard title="AI Symptom Triage" bg="rgba(2,62,138,0.1)" desc="Plain-language conversation that turns 'I don't feel right' into a clear next step in under a minute." />
            <FeatCard title="Licensed doctors, 24/7" bg="rgba(239,99,81,0.12)" desc="Real consultations from ₦3,500 — verified MDCN-licensed doctors, not chatbots pretending to be one." />
            <FeatCard title="Health Challenges & Points" bg="rgba(242,169,59,0.18)" desc="Earn points for hydration, steps, sleep and streaks — level up your wellness profile." />
            <FeatCard wide title="Women's Health Suite" bg="rgba(2,62,138,0.1)" desc="Cycle tracking, fertility windows, pregnancy journey and a PIN-protected Secret Chat vault — private by design." />
            <FeatCard title="Gift — your AI companion" bg="rgba(239,99,81,0.12)" desc="A daily check-in that learns your rhythms, tracks mood, and celebrates streaks with you." />
          </div>
        </div>
      </section>

      <section id="showcase">
        <div className="prb-wrap">
          <div className="prb-sec-head prb-reveal">
            <span className="prb-eyebrow">Beyond the consultation</span>
            <h2>Where Prescribly picks up where other apps stop.</h2>
          </div>

          <div className="prb-showcase-row prb-reveal">
            <div className="prb-showcase-text">
              <span className="tag">Doctor home visits</span>
              <h3>A verified doctor at your door, geo-matched in minutes.</h3>
              <p>Book an in-person visit and we'll match you to a licensed doctor within a 25-mile radius. Live tracking, secure payment, private notes.</p>
              <ul>
                <li><span className="check">✓</span><span><b>Geo-matched</b> to doctors nearby, not a random pool.</span></li>
                <li><span className="check">✓</span><span><b>Live tracking</b> from booked to knocked-on-your-door.</span></li>
              </ul>
            </div>
            <div className="prb-showcase-media">
              <div className="prb-mock-card">
                <div className="prb-mock-title">Home visit #HV-2291</div>
                <div className="prb-track-step done"><span className="prb-track-dot" />Booked with Dr. Amaka</div>
                <div className="prb-track-step done"><span className="prb-track-dot" />Doctor on the way</div>
                <div className="prb-track-step active"><span className="prb-track-dot" />5 minutes away</div>
                <div className="prb-track-step"><span className="prb-track-dot" />Arrived</div>
              </div>
            </div>
          </div>

          <div className="prb-showcase-row rev prb-reveal">
            <div className="prb-showcase-text">
              <span className="tag">Health timeline</span>
              <h3>Your whole medical history, not another folder of paper.</h3>
              <p>Every consultation, prescription and result lives in one private timeline — the next doctor you see already has the full picture.</p>
              <ul>
                <li><span className="check">✓</span><span>Auto-updated after every visit — nothing to file yourself.</span></li>
                <li><span className="check">✓</span><span>Share your history with a new doctor in one tap.</span></li>
              </ul>
            </div>
            <div className="prb-showcase-media">
              <div className="prb-mock-card">
                <div className="prb-mock-title">Health timeline</div>
                <div className="prb-ti-item"><span className="prb-ti-date">Jun 12</span><div className="prb-ti-body"><b>Consultation</b><span>Dr. Amaka — fever &amp; headache</span></div></div>
                <div className="prb-ti-item"><span className="prb-ti-date">Jun 12</span><div className="prb-ti-body"><b>Prescription issued</b><span>Antimalarial, 3-day course</span></div></div>
                <div className="prb-ti-item"><span className="prb-ti-date">Jun 16</span><div className="prb-ti-body"><b>Follow-up</b><span>Marked resolved by Dr. Amaka</span></div></div>
              </div>
            </div>
          </div>

          <div className="prb-showcase-row prb-reveal">
            <div className="prb-showcase-text">
              <span className="tag">For her</span>
              <h3>Women's Health Suite — private by design.</h3>
              <p>Cycle & fertility tracking, pregnancy journey, and a Secret Chat vault locked behind your own PIN. Only visible to accounts registered as female.</p>
              <ul>
                <li><span className="check">✓</span><span>PIN-protected Secret Chats — only you have the key.</span></li>
                <li><span className="check">✓</span><span>Each entry stays private to your account.</span></li>
              </ul>
            </div>
            <div className="prb-showcase-media">
              <div className="prb-mock-card">
                <div className="prb-mock-title">Cycle overview</div>
                <div className="prb-fam-row"><div className="prb-fam-avatar">🌸</div><div className="prb-fam-info"><b>Day 14 of 28</b><span>Fertile window — peak</span></div></div>
                <div className="prb-fam-row"><div className="prb-fam-avatar">🔒</div><div className="prb-fam-info"><b>Secret Chats</b><span>PIN-protected vault</span></div></div>
                <div className="prb-fam-row"><div className="prb-fam-avatar">🤰🏾</div><div className="prb-fam-info"><b>Pregnancy journey</b><span>Week-by-week guidance</span></div></div>
              </div>
            </div>
          </div>

          <div className="prb-mini-feats">
            {[
              { h: "Lab test booking", p: "Book blood work and scans, with results delivered straight to your app." },
              { h: "Doctor profiles & ratings", p: "See a doctor's specialty and patient ratings before you book." },
              { h: "Priority triage", p: "Symptoms flagged as urgent skip the line for the next available doctor." },
              { h: "Specialist referrals", p: "Get referred onward to a specialist without starting over elsewhere." },
            ].map((m, i) => (
              <div key={m.h} className="prb-mini-feat prb-reveal" style={{ ["--d" as any]: i }}>
                <div className="prb-mini-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="11" cy="11" r="7" stroke="#023E8A" strokeWidth="1.7" />
                    <path d="M20 20l-4.5-4.5" stroke="#023E8A" strokeWidth="1.7" strokeLinecap="round" />
                  </svg>
                </div>
                <h4>{m.h}</h4>
                <p>{m.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="reach" className="prb-reach">
        <div className="prb-wrap">
          <div className="prb-reach-intro">
            <span className="prb-eyebrow">Designed for the whole country</span>
            <h2 className="prb-sec-head" style={{ marginBottom: 0, color: "#fff" }}>
              Built for every state in the federation.
            </h2>
            <p style={{ marginTop: 18 }}>
              Prescribly isn't a Lagos-and-Abuja app. From Sokoto to Calabar, Maiduguri to Ibadan — it's built to serve
              patients across all 36 states and the FCT.
            </p>
          </div>
          <div className="prb-zones-grid">
            {ZONES.map((z, i) => (
              <div key={z.label} className="prb-zone-card prb-reveal" style={{ ["--d" as any]: i % 3 }}>
                <span className="zone-label">{z.label}</span>
                <div className="prb-state-tags">
                  {z.states.map((s) => (
                    <span key={s.name} className={`prb-state-tag ${s.capital ? "capital" : ""}`}>
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="prb-testi-band">
        <div className="prb-wrap">
          <div className="prb-sec-head prb-reveal" style={{ marginBottom: 48 }}>
            <span className="prb-eyebrow">Patients say it best</span>
            <h2>Trusted by the people who've used it.</h2>
          </div>
        </div>
        <div className="prb-marquee-mask">
          <div className="prb-marquee-track">
            {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
              <div key={i} className="prb-testi-card" aria-hidden={i >= TESTIMONIALS.length}>
                <div className="prb-testi-stars">★★★★★</div>
                <p className="prb-testi-text">{t.q}</p>
                <div className="prb-testi-who">
                  <div className="prb-testi-avatar" />
                  <div>
                    <div className="prb-testi-name">{t.name}</div>
                    <div className="prb-testi-loc">{t.loc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="doctors">
        <div className="prb-wrap">
          <div className="prb-split prb-reveal">
            <div className="prb-split-panel dark">
              <span className="prb-eyebrow" style={{ color: "#F2A93B" }}>For patients</span>
              <h3 style={{ marginTop: 16 }}>Care that meets you where you are.</h3>
              <p>Start free, chat with the AI triage, and only pay for the consultation you actually need.</p>
              <Link to="/register" className="prb-btn prb-btn-light" style={{ marginTop: 26 }}>
                Get started free
              </Link>
            </div>
            <div className="prb-split-panel light">
              <span className="prb-eyebrow">For doctors &amp; partners</span>
              <h3 style={{ marginTop: 16 }}>Join Prescribly's verified network.</h3>
              <p>
                Consult on your own schedule, reach patients across Nigeria, and get paid through infrastructure already
                built for local rails.
              </p>
              <Link to="/doctor-register" className="prb-btn prb-btn-ghost" style={{ marginTop: 26 }}>
                Apply as a doctor →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="prb-wrap">
          <div className="prb-final-cta prb-reveal">
            <div className="glow" />
            <div className="glow2" />
            <span className="prb-eyebrow" style={{ color: "#F2A93B" }}>Africa's healthcare operating system</span>
            <h2 style={{ marginTop: 16 }}>Your next consultation is minutes away.</h2>
            <p>Join the patients already using Prescribly to skip the waiting room entirely.</p>
            <div className="prb-cta-row">
              <Link to="/register" className="prb-btn prb-btn-light">Start a consultation →</Link>
              <Link to="/support" className="prb-btn prb-btn-ghost" style={{ borderColor: "rgba(255,255,255,0.35)", color: "#fff" }}>
                Talk to our team
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="prb-footer">
        <div className="prb-wrap">
          <div className="prb-foot-grid">
            <div>
              <div className="prb-logo" style={{ marginBottom: 14 }}>
                <LogoMark />
                Prescribly
              </div>
              <p style={{ maxWidth: 260, fontSize: 13.5 }}>
                Africa's Healthcare Operating System — built in Abuja, for every Nigerian.
              </p>
            </div>
            <div>
              <h4>Product</h4>
              <ul>
                <li><a href="#how">How it works</a></li>
                <li><a href="#features">Features</a></li>
                <li><Link to="/womens-health">Women's Health Suite</Link></li>
              </ul>
            </div>
            <div>
              <h4>Company</h4>
              <ul>
                <li><Link to="/about">About</Link></li>
                <li><a href="#doctors">For doctors</a></li>
                <li><Link to="/careers">Careers</Link></li>
              </ul>
            </div>
            <div>
              <h4>Get in touch</h4>
              <ul>
                <li><Link to="/support">Contact us</Link></li>
                <li><a href="mailto:hello@prescribly.app">hello@prescribly.app</a></li>
                <li><span>Abuja, Nigeria</span></li>
              </ul>
            </div>
          </div>
          <div className="prb-foot-bottom">
            <span>© {new Date().getFullYear()} Prescribly Inc. All rights reserved.</span>
            <span>Made for Nigeria's next 200 million patients.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

/* ---------- helpers ---------- */

const LogoMark = () => (
  <svg className="prb-logo-mark" viewBox="0 0 30 30" fill="none" width={30} height={30}>
    <circle cx="15" cy="15" r="14" stroke="#023E8A" strokeWidth="2" />
    <path
      d="M6 15 L11 15 L13 9 L17 21 L19 15 L24 15"
      stroke="#EF6351"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const FeatCard = ({
  title,
  desc,
  bg,
  wide,
}: {
  title: string;
  desc: string;
  bg: string;
  wide?: boolean;
}) => (
  <div className={`prb-feat-card prb-reveal ${wide ? "wide" : ""}`}>
    <div className="prb-feat-icon" style={{ background: bg }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 21s-7-4.5-9.5-9C.7 8.2 2.7 4 7 4c2.2 0 3.8 1.4 5 3 1.2-1.6 2.8-3 5-3 4.3 0 6.3 4.2 4.5 8-2.5 4.5-9.5 9-9.5 9Z"
          stroke="#023E8A"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    </div>
    <h3>{title}</h3>
    <p>{desc}</p>
  </div>
);

const TESTIMONIALS = [
  { q: "I was dreading another hospital queue with a fever. Instead I was talking to a doctor within minutes, right from my phone.", name: "Chiamaka O.", loc: "Abuja" },
  { q: "The AI actually asked the right follow-up questions before handing me off. It felt like a proper triage nurse, not a form.", name: "Tunde A.", loc: "Lagos" },
  { q: "The Women's Health Suite finally gave me a place to ask questions I'd never bring up in a crowded clinic waiting room.", name: "Fatima Y.", loc: "Kaduna" },
  { q: "I've used three different health apps in Nigeria. This is the first one where I actually reached a licensed doctor, not a call center.", name: "Emeka N.", loc: "Enugu" },
  { q: "My mum is 62 and not exactly a tech person, but even she found booking a consultation simple enough to do alone.", name: "Blessing I.", loc: "Port Harcourt" },
];

const ZONES = [
  { label: "North Central", states: [{ name: "FCT (Abuja)", capital: true }, { name: "Benue" }, { name: "Kogi" }, { name: "Kwara" }, { name: "Nasarawa" }, { name: "Niger" }, { name: "Plateau" }] },
  { label: "North East", states: [{ name: "Adamawa" }, { name: "Bauchi" }, { name: "Borno" }, { name: "Gombe" }, { name: "Taraba" }, { name: "Yobe" }] },
  { label: "North West", states: [{ name: "Jigawa" }, { name: "Kaduna" }, { name: "Kano" }, { name: "Katsina" }, { name: "Kebbi" }, { name: "Sokoto" }, { name: "Zamfara" }] },
  { label: "South East", states: [{ name: "Abia" }, { name: "Anambra" }, { name: "Ebonyi" }, { name: "Enugu" }, { name: "Imo" }] },
  { label: "South South", states: [{ name: "Akwa Ibom" }, { name: "Bayelsa" }, { name: "Cross River" }, { name: "Delta" }, { name: "Edo" }, { name: "Rivers" }] },
  { label: "South West", states: [{ name: "Ekiti" }, { name: "Lagos" }, { name: "Ogun" }, { name: "Ondo" }, { name: "Osun" }, { name: "Oyo" }] },
] as { label: string; states: { name: string; capital?: boolean }[] }[];

/* ---------- scoped stylesheet (ported verbatim from the approved brief) ---------- */

const PRB_CSS = `
.prb-root{
  --ink:#071B36; --brand:#023E8A; --brand-light:#1668D1; --electric:#4FA8FF;
  --amber:#F2A93B; --coral:#EF6351; --cream:#F3F7FC; --cream-dim:#E7EEF8;
  --line:rgba(2,62,138,0.12); --text:#0E1E33; --text-soft:#4B5A72;
  --glow:rgba(11,87,184,0.35); --radius:20px; --maxw:1180px;
  background:var(--cream); color:var(--text);
  font-family:'Space Grotesk', sans-serif; -webkit-font-smoothing:antialiased;
  overflow-x:hidden; position:relative; min-height:100vh;
}
.prb-root *{box-sizing:border-box;}
.prb-root h1,.prb-root h2,.prb-root h3,.prb-root h4{
  font-family:'Fraunces', serif; font-weight:600; letter-spacing:-0.01em; margin:0; color:var(--ink);
}
.prb-root p{ color:var(--text-soft); line-height:1.65; margin:0; }
.prb-root a{ color:inherit; text-decoration:none; }
.prb-wrap{ max-width:var(--maxw); margin:0 auto; padding:0 32px; }

.prb-bg-atmosphere{ position:fixed; inset:0; z-index:0; pointer-events:none; overflow:hidden; }
.prb-bg-atmosphere span{ position:absolute; border-radius:50%; filter:blur(90px); opacity:0.35; animation:prb-drift 22s ease-in-out infinite alternate; }
.prb-bg-atmosphere .b1{ width:520px; height:520px; background:var(--brand); top:-160px; right:-120px; }
.prb-bg-atmosphere .b2{ width:420px; height:420px; background:var(--electric); top:40%; left:-160px; animation-delay:-8s; }
.prb-bg-atmosphere .b3{ width:380px; height:380px; background:var(--brand-light); bottom:-140px; right:10%; animation-delay:-14s; }
@keyframes prb-drift{ from{ transform:translate(0,0) scale(1);} to{ transform:translate(40px,-30px) scale(1.08);} }

#prb-spotlight{ position:absolute; inset:0; pointer-events:none; z-index:0;
  background:radial-gradient(600px circle at var(--mx,50%) var(--my,20%), rgba(11,87,184,0.16), transparent 60%);
  transition:background .1s; }

.prb-progress-bar{ position:fixed; top:0; left:0; height:3px; width:0%;
  background:linear-gradient(90deg,var(--brand),var(--electric)); z-index:200; transition:width .1s; }

.prb-grad-text{ background:linear-gradient(100deg, var(--brand) 10%, var(--electric) 50%, var(--brand-light) 90%);
  -webkit-background-clip:text; background-clip:text; color:transparent; font-style:italic; }

.prb-eyebrow{ display:inline-flex; align-items:center; gap:8px; font-size:12.5px; letter-spacing:0.14em;
  text-transform:uppercase; color:var(--brand); font-weight:600; }
.prb-eyebrow::before{ content:""; width:7px; height:7px; border-radius:50%;
  background:var(--coral); box-shadow:0 0 0 4px rgba(239,99,81,0.15); }

.prb-btn{ display:inline-flex; align-items:center; justify-content:center; gap:8px;
  padding:15px 26px; border-radius:999px; font-weight:600; font-size:15.5px; cursor:pointer;
  border:1px solid transparent; transition:transform .35s cubic-bezier(.2,.8,.2,1), box-shadow .35s; white-space:nowrap; }
.prb-btn-primary{ background:linear-gradient(135deg, var(--brand), var(--brand-light)); color:#fff;
  box-shadow:0 10px 26px -8px rgba(11,87,184,0.55), 0 0 0 1px rgba(255,255,255,0.06) inset; }
.prb-btn-primary:hover{ transform:translateY(-2px); box-shadow:0 18px 36px -10px rgba(11,87,184,0.65), 0 0 0 1px rgba(255,255,255,0.08) inset; }
.prb-btn-ghost{ background:transparent; color:var(--ink); border-color:rgba(11,27,50,0.18); }
.prb-btn-ghost:hover{ border-color:var(--ink); }
.prb-btn-light{ background:var(--cream); color:var(--ink); }
.prb-btn-light:hover{ transform:translateY(-2px); }

.prb-reveal{ opacity:0; transform:translateY(22px); transition:opacity .8s ease, transform .8s cubic-bezier(.2,.7,.2,1); transition-delay:calc(var(--d, 0) * 90ms); }
.prb-reveal.in{ opacity:1; transform:translateY(0); }

#prb-header{ position:fixed; top:0; left:0; right:0; z-index:100;
  background:rgba(243,247,252,0.72); backdrop-filter:blur(14px);
  border-bottom:1px solid transparent; transition:border-color .3s, background .3s; }
#prb-header.scrolled{ border-color:var(--line); }
#prb-header nav{ display:flex; align-items:center; justify-content:space-between; padding:18px 32px; max-width:var(--maxw); margin:0 auto; }
.prb-logo{ display:flex; align-items:center; gap:10px; font-family:'Fraunces',serif; font-weight:700; font-size:20px; color:var(--ink); }
.prb-logo-mark{ width:30px; height:30px; }
.prb-nav-links{ display:flex; align-items:center; gap:34px; font-size:14.5px; font-weight:500; color:var(--text-soft); }
.prb-nav-links a:hover{ color:var(--ink); }
.prb-nav-cta{ display:flex; align-items:center; gap:14px; }
@media (max-width:860px){ .prb-nav-links{ display:none; } }

.prb-hero{ position:relative; padding:170px 0 100px; overflow:hidden;
  background:
    radial-gradient(800px 480px at 85% -10%, rgba(11,87,184,0.22), transparent 60%),
    radial-gradient(700px 560px at -8% 20%, rgba(2,62,138,0.14), transparent 60%),
    radial-gradient(500px 400px at 60% 100%, rgba(79,168,255,0.12), transparent 60%); }
.prb-hero-grid{ display:grid; grid-template-columns:1.05fr 0.95fr; gap:64px; align-items:center; }
@media (max-width:980px){ .prb-hero-grid{ grid-template-columns:1fr; } }
.prb-hero h1{ font-size:clamp(38px,5.2vw,64px); line-height:1.03; margin:22px 0 22px; }
.prb-lead{ font-size:18.5px; max-width:480px; margin-bottom:34px; }
.prb-hero-ctas{ display:flex; gap:16px; flex-wrap:wrap; margin-bottom:38px; }
.prb-hero-trust{ display:flex; align-items:center; gap:18px; font-size:13.5px; color:var(--text-soft); }
.prb-avatars{ display:flex; }
.prb-avatars span{ width:30px;height:30px;border-radius:50%;border:2.5px solid var(--cream);
  margin-left:-9px; display:inline-block; background:linear-gradient(135deg,var(--brand),var(--brand-light)); }
.prb-avatars span:first-child{ margin-left:0; }

.prb-phone-stage{ position:relative; display:flex; justify-content:center; z-index:1; }
.prb-phone-tilt{ transition:transform .25s cubic-bezier(.2,.7,.2,1); transform-style:preserve-3d; }
.prb-phone{ width:290px; height:582px; border-radius:42px; background:linear-gradient(160deg,#0B2A54,var(--ink));
  padding:14px; box-shadow:0 50px 90px -20px rgba(2,62,138,0.55), 0 0 60px -10px rgba(79,168,255,0.35), 0 0 0 1px rgba(79,168,255,0.15);
  position:relative; animation:prb-floaty 6s ease-in-out infinite; }
@keyframes prb-floaty{ 0%,100%{ transform:translateY(0) rotate(-1.2deg);} 50%{ transform:translateY(-14px) rotate(0.4deg);} }
.prb-phone-notch{ position:absolute; top:14px; left:50%; transform:translateX(-50%); width:90px; height:20px; background:var(--ink); border-radius:0 0 14px 14px; z-index:3;}
.prb-phone-screen{ background:linear-gradient(180deg,#EFF4FA,var(--cream)); width:100%; height:100%; border-radius:30px; overflow:hidden; position:relative; display:flex; flex-direction:column; }
.prb-phone-topbar{ padding:26px 18px 12px; display:flex; align-items:center; gap:10px; background:var(--brand); color:#fff; }
.prb-phone-topbar .dot{ width:34px;height:34px;border-radius:50%; background:rgba(255,255,255,0.18); display:flex; align-items:center; justify-content:center; font-size:15px;}
.prb-phone-topbar .who b{ display:block; font-size:14px; color:#fff; font-family:'Space Grotesk',sans-serif; }
.prb-phone-topbar .who span{ font-size:11.5px; opacity:0.85; }
.prb-status-dot{ width:7px;height:7px;border-radius:50%; background:#5FE0A5; display:inline-block; margin-right:5px;}
.prb-chat-body{ flex:1; padding:16px 14px; display:flex; flex-direction:column; gap:10px; overflow:hidden; }
.prb-bubble{ max-width:78%; padding:10px 14px; border-radius:16px; font-size:12.5px; line-height:1.4;
  opacity:0; transform:translateY(8px); animation:prb-pop .5s ease forwards; }
@keyframes prb-pop{ to{ opacity:1; transform:translateY(0);} }
.prb-bubble.them{ background:#fff; border:1px solid var(--line); align-self:flex-start; border-bottom-left-radius:4px; color:var(--ink); }
.prb-bubble.me{ background:var(--brand); color:#fff; align-self:flex-end; border-bottom-right-radius:4px; }
.prb-bubble.ai{ background:var(--amber); color:var(--ink); align-self:flex-start; border-bottom-left-radius:4px; font-weight:600; }
.prb-bubble.b1{ animation-delay:.4s; } .prb-bubble.b2{ animation-delay:1.3s; }
.prb-bubble.b3{ animation-delay:2.2s; } .prb-bubble.b4{ animation-delay:3.3s; }
.prb-typing{ align-self:flex-start; display:flex; gap:4px; padding:10px 14px; background:#fff; border:1px solid var(--line); border-radius:16px; border-bottom-left-radius:4px; opacity:0; animation:prb-pop .4s ease forwards 1.9s;}
.prb-typing i{ width:6px;height:6px;border-radius:50%; background:#9AA7BC; animation:prb-bounce 1.1s infinite; }
.prb-typing i:nth-child(2){ animation-delay:.15s; } .prb-typing i:nth-child(3){ animation-delay:.3s; }
@keyframes prb-bounce{ 0%,60%,100%{ transform:translateY(0);} 30%{ transform:translateY(-4px);} }
.prb-phone-footer{ padding:12px 14px; border-top:1px solid var(--line); background:#fff; display:flex; align-items:center; gap:10px;}
.prb-phone-footer .pill{ flex:1; height:34px; border-radius:999px; background:var(--cream-dim); }
.prb-phone-footer .send{ width:34px;height:34px;border-radius:50%; background:var(--coral); }
.prb-badge-float{ position:absolute; background:#fff; border-radius:16px; padding:12px 16px;
  box-shadow:0 16px 30px -10px rgba(11,27,50,0.25); display:flex; align-items:center; gap:10px;
  font-size:12.5px; font-weight:600; color:var(--ink); animation:prb-floaty 6s ease-in-out infinite; z-index:2; }
.prb-badge-float.badge-1{ top:8%; left:-8%; animation-delay:.5s; }
.prb-badge-float.badge-2{ bottom:6%; right:-10%; animation-delay:1.1s; }
@media (max-width:980px){ .prb-badge-float{ display:none; } .prb-phone{ width:250px; height:502px;} }

.prb-pillars-band{ background:linear-gradient(180deg,var(--ink),#051428); padding:64px 0; position:relative; overflow:hidden; }
.prb-pillars-band::before{ content:""; position:absolute; width:600px; height:600px; border-radius:50%;
  background:radial-gradient(circle, rgba(79,168,255,0.16), transparent 70%); top:-260px; left:30%; pointer-events:none; }
.prb-pillars-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:36px; position:relative; z-index:1; }
@media (max-width:860px){ .prb-pillars-grid{ grid-template-columns:1fr; } }
.prb-pillar{ text-align:left; border-left:2px solid; border-image:linear-gradient(180deg, var(--electric), transparent) 1; padding-left:22px; }
.prb-pillar .pnum{ font-family:'Fraunces',serif; font-size:15px; color:var(--electric); font-weight:600; display:block; margin-bottom:10px; }
.prb-pillar h3{ color:var(--cream); font-size:21px; margin-bottom:8px; }
.prb-pillar p{ color:rgba(243,247,252,0.62); font-size:14px; }

.prb-root section{ padding:120px 0; position:relative; }
.prb-sec-head{ max-width:640px; margin-bottom:64px; }
.prb-sec-head h2{ font-size:clamp(28px,3.6vw,42px); margin-top:16px; }

.prb-flow{ position:relative; }
.prb-flow-line{ position:absolute; top:56px; left:0; right:0; height:2px; z-index:0; }
.prb-flow-line svg{ width:100%; height:6px; overflow:visible; }
.prb-flow-line path{ fill:none; stroke:var(--brand); stroke-width:2; stroke-dasharray:6 10; stroke-linecap:round; }
.prb-flow-steps{ display:grid; grid-template-columns:repeat(3,1fr); gap:36px; position:relative; z-index:1; }
@media (max-width:860px){ .prb-flow-steps{ grid-template-columns:1fr; } .prb-flow-line{ display:none; } }
.prb-step{ background:#fff; border:1px solid var(--line); border-radius:var(--radius); padding:32px 28px; transition:transform .4s, box-shadow .4s; }
.prb-step:hover{ transform:translateY(-6px); box-shadow:0 20px 34px -18px rgba(11,27,50,0.25); }
.prb-step .idx{ font-family:'Fraunces',serif; font-size:15px; color:var(--coral); font-weight:700; margin-bottom:18px; display:block;}
.prb-step h3{ font-size:20px; margin-bottom:10px; }
.prb-step p{ font-size:14.5px; }
.prb-step-icon{ width:46px; height:46px; border-radius:14px; background:var(--cream-dim); display:flex; align-items:center; justify-content:center; margin-bottom:18px;}

.prb-features-band{ background:var(--cream-dim); }
.prb-feat-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:24px; }
@media (max-width:920px){ .prb-feat-grid{ grid-template-columns:1fr 1fr; } }
@media (max-width:640px){ .prb-feat-grid{ grid-template-columns:1fr; } }
.prb-feat-card{ background:#fff; border-radius:18px; padding:30px 26px; border:1px solid var(--line);
  transition:transform .4s cubic-bezier(.2,.8,.2,1), box-shadow .4s, border-color .4s; position:relative; overflow:hidden; }
.prb-feat-card:hover{ transform:translateY(-6px); box-shadow:0 22px 44px -18px rgba(2,62,138,0.35); border-color:transparent; }
.prb-feat-icon{ width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; margin-bottom:20px; }
.prb-feat-card h3{ font-size:18px; margin-bottom:8px; }
.prb-feat-card p{ font-size:14px; }
.prb-feat-card.wide{ grid-column:span 2; }
@media (max-width:920px){ .prb-feat-card.wide{ grid-column:span 1; } }

.prb-showcase-row{ display:grid; grid-template-columns:1fr 1fr; gap:64px; align-items:center; margin-bottom:110px; }
.prb-showcase-row:last-of-type{ margin-bottom:0; }
.prb-showcase-row.rev .prb-showcase-media{ order:2; }
.prb-showcase-row.rev .prb-showcase-text{ order:1; }
@media (max-width:900px){ .prb-showcase-row, .prb-showcase-row.rev{ grid-template-columns:1fr; } .prb-showcase-row.rev .prb-showcase-media{ order:0; } .prb-showcase-row.rev .prb-showcase-text{ order:0; } }
.prb-showcase-text .tag{ display:inline-block; font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--coral); margin-bottom:14px; }
.prb-showcase-text h3{ font-size:clamp(22px,2.6vw,30px); margin-bottom:14px; }
.prb-showcase-text p{ font-size:15.5px; max-width:420px; margin-bottom:20px; }
.prb-showcase-text ul{ list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:10px; }
.prb-showcase-text ul li{ display:flex; gap:10px; font-size:14px; color:var(--text-soft); align-items:flex-start; }
.prb-showcase-text ul li b{ color:var(--ink); }
.prb-showcase-text .check{ width:18px; height:18px; border-radius:50%; background:rgba(2,62,138,0.1); color:var(--brand); flex:none; display:flex; align-items:center; justify-content:center; font-size:11px; margin-top:2px; }
.prb-showcase-media{ display:flex; justify-content:center; }
.prb-mock-card{ background:#fff; border:1px solid var(--line); border-radius:20px; padding:26px;
  box-shadow:0 24px 46px -24px rgba(11,27,50,0.25); width:100%; max-width:380px; transition:transform .4s; }
.prb-mock-card:hover{ transform:translateY(-4px) rotate(-0.3deg); box-shadow:0 30px 54px -22px rgba(2,62,138,0.4); }
.prb-mock-title{ font-size:12.5px; font-weight:700; color:var(--text-soft); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:18px; }

.prb-track-step{ position:relative; padding:0 0 22px 26px; font-size:13.5px; color:var(--text-soft); }
.prb-track-step:last-child{ padding-bottom:0; }
.prb-track-step::before{ content:""; position:absolute; left:4px; top:2px; bottom:-2px; width:2px; background:var(--line); }
.prb-track-step:last-child::before{ display:none; }
.prb-track-dot{ position:absolute; left:0; top:0; width:10px; height:10px; border-radius:50%; background:var(--line); }
.prb-track-step.done{ color:var(--ink); font-weight:600; }
.prb-track-step.done .prb-track-dot{ background:var(--brand); }
.prb-track-step.active{ color:var(--ink); font-weight:600; }
.prb-track-step.active .prb-track-dot{ background:var(--coral); box-shadow:0 0 0 5px rgba(239,99,81,0.18); animation:prb-pulse-dot 1.6s ease-in-out infinite; }
@keyframes prb-pulse-dot{ 0%,100%{ box-shadow:0 0 0 5px rgba(239,99,81,0.18);} 50%{ box-shadow:0 0 0 9px rgba(239,99,81,0.06);} }

.prb-ti-item{ display:flex; gap:14px; padding-bottom:18px; }
.prb-ti-item:last-child{ padding-bottom:0; }
.prb-ti-date{ font-size:11.5px; font-weight:700; color:var(--brand); width:44px; flex:none; padding-top:2px; }
.prb-ti-body{ border-left:2px solid var(--line); padding-left:14px; }
.prb-ti-body b{ display:block; font-size:13.5px; color:var(--ink); margin-bottom:2px; font-family:'Space Grotesk',sans-serif; }
.prb-ti-body span{ font-size:12.5px; color:var(--text-soft); }

.prb-fam-row{ display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid var(--line); }
.prb-fam-row:last-child{ border-bottom:none; }
.prb-fam-avatar{ width:38px; height:38px; border-radius:50%; background:var(--cream-dim); display:flex; align-items:center; justify-content:center; font-size:17px; flex:none; }
.prb-fam-info b{ display:block; font-size:13.5px; color:var(--ink); font-family:'Space Grotesk',sans-serif; }
.prb-fam-info span{ font-size:12px; color:var(--text-soft); }

.prb-mini-feats{ display:grid; grid-template-columns:repeat(4,1fr); gap:20px; margin-top:90px; padding-top:56px; border-top:1px solid var(--line); }
@media (max-width:860px){ .prb-mini-feats{ grid-template-columns:1fr 1fr; } }
.prb-mini-feat{ display:flex; flex-direction:column; gap:12px; }
.prb-mini-feat .prb-mini-icon{ width:38px; height:38px; border-radius:10px; background:var(--cream-dim); display:flex; align-items:center; justify-content:center; }
.prb-mini-feat h4{ font-family:'Fraunces',serif; font-size:15.5px; color:var(--ink); font-weight:600; margin:0; }
.prb-mini-feat p{ font-size:13px; margin:0; }

.prb-reach{ position:relative; background:linear-gradient(180deg,var(--ink),#051428); color:var(--cream); overflow:hidden; }
.prb-reach::before{ content:""; position:absolute; width:700px; height:700px; border-radius:50%; background:radial-gradient(circle, rgba(79,168,255,0.14), transparent 70%); top:-300px; right:-200px; pointer-events:none; }
.prb-reach .prb-sec-head p{ color:rgba(243,247,252,0.65); }
.prb-reach .prb-eyebrow{ color:var(--electric); }
.prb-reach .prb-eyebrow::before{ background:var(--electric); box-shadow:0 0 0 4px rgba(79,168,255,0.18); }
.prb-reach-intro{ max-width:640px; margin-bottom:56px; position:relative; z-index:1; }
.prb-reach-intro p{ color:rgba(243,247,252,0.65); }
.prb-zones-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:22px; position:relative; z-index:1; }
@media (max-width:920px){ .prb-zones-grid{ grid-template-columns:repeat(2,1fr);} }
@media (max-width:600px){ .prb-zones-grid{ grid-template-columns:1fr;} }
.prb-zone-card{ background:rgba(243,247,252,0.04); border:1px solid rgba(243,247,252,0.12); border-radius:18px; padding:24px 22px; transition:transform .4s, border-color .4s, background .4s; }
.prb-zone-card:hover{ transform:translateY(-5px); border-color:rgba(79,168,255,0.5); background:rgba(243,247,252,0.07); box-shadow:0 20px 40px -20px rgba(2,62,138,0.5); }
.prb-zone-card .zone-label{ font-size:11.5px; letter-spacing:0.12em; text-transform:uppercase; color:var(--amber); font-weight:600; margin-bottom:14px; display:block; }
.prb-state-tags{ display:flex; flex-wrap:wrap; gap:8px; }
.prb-state-tag{ font-size:12.5px; padding:6px 12px; border-radius:999px; background:rgba(243,247,252,0.08); color:rgba(243,247,252,0.85); border:1px solid rgba(243,247,252,0.1); }
.prb-state-tag.capital{ background:var(--amber); color:var(--ink); font-weight:700; border-color:transparent; }

.prb-testi-band{ padding:120px 0 130px; overflow:hidden; }
.prb-marquee-mask{ width:100%; overflow:hidden; position:relative; }
.prb-marquee-mask::before, .prb-marquee-mask::after{ content:""; position:absolute; top:0; bottom:0; width:90px; z-index:2; pointer-events:none; }
.prb-marquee-mask::before{ left:0; background:linear-gradient(90deg, var(--cream), transparent); }
.prb-marquee-mask::after{ right:0; background:linear-gradient(270deg, var(--cream), transparent); }
.prb-marquee-track{ display:flex; gap:24px; width:max-content; animation:prb-scroll-left 46s linear infinite; }
.prb-marquee-track:hover{ animation-play-state:paused; }
@keyframes prb-scroll-left{ from{ transform:translateX(0); } to{ transform:translateX(-50%); } }
.prb-testi-card{ flex:none; width:340px; background:#fff; border:1px solid var(--line); border-radius:20px; padding:28px 26px;
  display:flex; flex-direction:column; gap:16px; box-shadow:0 14px 30px -20px rgba(11,27,50,0.18); }
.prb-testi-stars{ color:var(--amber); font-size:14px; letter-spacing:2px; }
.prb-testi-text{ font-family:'Fraunces',serif; font-style:italic; font-size:16.5px; color:var(--ink); line-height:1.5; }
.prb-testi-who{ display:flex; align-items:center; gap:12px; margin-top:auto; }
.prb-testi-avatar{ width:38px; height:38px; border-radius:50%; background:linear-gradient(135deg,var(--brand),var(--brand-light)); flex:none; }
.prb-testi-name{ font-size:13.5px; font-weight:700; color:var(--ink); }
.prb-testi-loc{ font-size:12px; color:var(--text-soft); }

.prb-split{ display:grid; grid-template-columns:1fr 1fr; gap:0; border-radius:28px; overflow:hidden; box-shadow:0 30px 60px -30px rgba(11,27,50,0.3); }
@media (max-width:860px){ .prb-split{ grid-template-columns:1fr; } }
.prb-split-panel{ padding:56px 46px; }
.prb-split-panel.dark{ background:var(--brand); color:#fff; }
.prb-split-panel.dark p{ color:rgba(255,255,255,0.78); }
.prb-split-panel.light{ background:#fff; border:1px solid var(--line); }
.prb-split-panel h3{ font-size:26px; margin-bottom:14px; color:inherit; }
.prb-split-panel.dark h3{ color:#fff; }

.prb-final-cta{ position:relative; background:linear-gradient(135deg, var(--brand) 0%, #041B3D 100%); border-radius:32px; padding:70px 50px; overflow:hidden; text-align:center; color:#fff; box-shadow:0 40px 90px -30px rgba(2,62,138,0.5); }
.prb-final-cta h2{ color:#fff; font-size:clamp(28px,4vw,46px); margin-bottom:16px; }
.prb-final-cta p{ color:rgba(255,255,255,0.8); max-width:520px; margin:0 auto 34px; }
.prb-final-cta .glow{ position:absolute; width:500px; height:500px; border-radius:50%; background:radial-gradient(circle, rgba(79,168,255,0.4), transparent 70%); top:-220px; right:-120px; }
.prb-final-cta .glow2{ position:absolute; width:360px; height:360px; border-radius:50%; background:radial-gradient(circle, rgba(242,169,59,0.18), transparent 70%); bottom:-160px; left:-80px; }
.prb-cta-row{ display:flex; gap:16px; justify-content:center; flex-wrap:wrap; position:relative; z-index:1; }

.prb-footer{ padding:70px 0 34px; }
.prb-foot-grid{ display:grid; grid-template-columns:1.4fr 1fr 1fr 1fr; gap:40px; margin-bottom:50px; }
@media (max-width:760px){ .prb-foot-grid{ grid-template-columns:1fr 1fr; } }
.prb-foot-grid h4{ font-size:13px; text-transform:uppercase; letter-spacing:0.08em; color:var(--ink); margin-bottom:16px; }
.prb-foot-grid ul{ list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:10px; }
.prb-foot-grid a, .prb-foot-grid span{ font-size:14px; color:var(--text-soft); }
.prb-foot-grid a:hover{ color:var(--ink); }
.prb-foot-bottom{ display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--line); padding-top:26px; font-size:13px; color:var(--text-soft); flex-wrap:wrap; gap:12px;}

@media (prefers-reduced-motion: reduce){ .prb-root *{ animation:none !important; transition:none !important; } }
`;

export default LandingPage;
