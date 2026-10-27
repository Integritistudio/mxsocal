/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { FiArrowUpRight } from "react-icons/fi";
import { getHomeContent } from "@/lib/home-content";
import { PublicSiteHeader, PublicSiteFooter } from "./PublicSiteChrome";
import { Reveal, HeroMedia, Marquee, Chip, DayScroller, BikeRail, TrackReveal, type DayStep } from "./HomeThreeInteractions";
import { HomeOnePaddock, HomeOneFounder } from "./HomeOneInteractions";
import shared from "./contact-design.module.css";
import s from "./home-three.module.css";

const features = ["Race-ready bikes", "Local tracks", "Daily gear", "Trackside coaching", "Your crew", "Zero hassle"];
const day: DayStep[] = [
  { time: "01", title: "Your bike", text: "A maintained, race-ready machine from the fleet—chosen by you, prepped by us.", image: "/images/home/img3.jpg", alt: "MXSoCal bike prepped and ready in the paddock" },
  { time: "02", title: "Your dirt", text: "Southern California tracks with real reputation. Pick one, or leave that part for later.", image: "/images/home/img4.jpg", alt: "Rider heading out onto the motocross track" },
  { time: "03", title: "Your gear", text: "Bring what you love, or add a daily gear bundle so you show up ride-ready.", image: "/images/home/img5.jpg", alt: "Riders resting in the paddock between motos" },
  { time: "04", title: "Your pace", text: "Add coaching when you want it. One coach can ride with the whole group.", image: "/images/home/img1.jpg", alt: "Coach and rider talking trackside" },
  { time: "05", title: "Your people", text: "Bring buddies on the same dates. Everyone gets a bike, and the day stays together.", image: "/images/home/img2.jpg", alt: "Riders on the track in late afternoon light" },
];

export default async function HomeThreeDesign() {
  const { bikes, tracks, coaches } = await getHomeContent();
  const trackList = tracks?.slice(0, 5) ?? [];
  return <div className={`${shared.page} ${s.page}`}><a href="#main-content" className={shared.skip}>Skip to content</a><PublicSiteHeader compact activePath="/" /><main id="main-content">

    <section className={s.hero} aria-labelledby="home-three-title">
      <HeroMedia />
      <div className={`${s.wrap} ${s.heroBody}`}>
        <h1 id="home-three-title">First light.<br />Full <em>throttle.</em></h1>
        <div className={s.heroCopy}>
          <p>A Southern California ride day—from the truck loaded to the last lap at dusk. Pick the bike. We shape the day around it.</p>
          <Link href="/bikes" className={s.button}>Build your day<FiArrowUpRight /></Link>
          <small>Two-day minimum · Request first, pay after approval</small>
        </div>
      </div>
      <Marquee items={features} className={s.heroMarquee} />
    </section>

    <div className={`${s.sheet} ${s.light}`}>
      <Reveal className={`${s.wrap} ${s.statement}`}>
        <h2>A ride day should feel like a <Chip src="/images/home/img3.jpg" alt="" /> ride day. Not a checklist. The bike you want, dirt you’ll <Chip src="/images/home/img4.jpg" alt="" /> remember, and people who already <Chip src="/images/home/img1.jpg" alt="" /> know the way in.</h2>
        <div className={s.statementMeta}>
          <p>MXSoCal is a Southern California motocross crew. Race-ready fleet, local tracks, gear and coaching when you want them—so your day starts at the gate, not in a group chat.</p>
          <Link href="/about-us" className={s.button}>About MXSoCal<FiArrowUpRight /></Link>
        </div>
      </Reveal>

      <section className={`${s.wrap} ${s.dayWrap}`} aria-label="What comes with your ride">
        <DayScroller steps={day} />
      </section>

      <section className={`${s.wrap} ${s.fleet}`} aria-labelledby="home-three-fleet">
        <Reveal className={s.sectionTop}>
          <div><span className={s.eyebrow}>The fleet</span><h2 id="home-three-fleet">Start with the bike.<br /><em>Everything follows.</em></h2></div>
          <Link href="/bikes" className={s.button}>See all bikes<FiArrowUpRight /></Link>
        </Reveal>
        {bikes?.length ? <BikeRail bikes={bikes} /> : <p className={s.empty}>{bikes === null ? "Bikes are temporarily unavailable." : "New bikes are on the way."} <Link href="/bikes">Browse bikes</Link></p>}
      </section>
    </div>

    <div className={`${s.sheet} ${s.dark}`}>
      <section className={`${s.wrap} ${s.tracks}`} aria-labelledby="home-three-tracks">
        <Reveal className={s.sectionTop}>
          <div><span className={s.eyebrow}>The dirt</span><h2 id="home-three-tracks">Tracks with a<br /><em>reputation.</em></h2></div>
          <p className={s.sectionNote}>Hover a name. Then go ride it.</p>
        </Reveal>
        {trackList.length ? <Reveal><TrackReveal tracks={trackList} /></Reveal> : <p className={s.empty}>Track details are temporarily unavailable. <Link href="/tracks">View tracks</Link></p>}
      </section>
    </div>

    <div className={`${s.sheet} ${s.light}`}>
      <section className={`${s.wrap} ${s.coaches}`} aria-labelledby="home-three-coaches">
        <Reveal className={s.sectionTop}>
          <div><span className={s.eyebrow}>On the track with you</span><h2 id="home-three-coaches">Coaching that<br /><em>rides along.</em></h2></div>
          <Link href="/coaches" className={s.button}>Meet all coaches<FiArrowUpRight /></Link>
        </Reveal>
        <div className={s.coachGrid}>
          {coaches?.slice(0, 3).map((coach, index) => {
            const name = `${coach.firstName} ${coach.lastName}`;
            const book = `/contact-us?coach=${encodeURIComponent(coach.id)}&name=${encodeURIComponent(name)}`;
            const rate = coach.dailyRate != null ? `${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(coach.dailyRate))} / day` : "Ask about rates";
            return <Reveal key={coach.id} delay={index * 0.08}>
              <Link href={book} className={s.coach} aria-label={`Book a session with ${name}`}>
                <div className={s.coachPhoto}>{coach.profileImage && <img src={coach.profileImage} alt={name} loading="lazy" />}<span>Book session<FiArrowUpRight /></span></div>
                <h3>{name}</h3>
                <p>{coach.specialty || "Motocross coaching"}</p>
                <div className={s.coachMeta}><b>{rate}</b><span>One coach, your whole group</span></div>
              </Link>
            </Reveal>;
          })}
        </div>
        {!coaches?.length && <p className={s.empty}>Contact our team to talk about coaching for your group.</p>}
      </section>
    </div>

    <div className={`${s.sheet} ${s.dark} ${s.paddockSheet}`}>
      <Reveal><HomeOnePaddock /></Reveal>
    </div>

    <div className={s.founderSheet}>
      <HomeOneFounder />
    </div>

  </main><PublicSiteFooter /></div>;
}
