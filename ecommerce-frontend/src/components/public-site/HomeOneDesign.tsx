/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { FiArrowUpRight } from "react-icons/fi";
import { getHomeContent } from "@/lib/home-content";
import { PublicSiteHeader, PublicSiteFooter } from "./PublicSiteChrome";
import { HomeOneVideo, HomeOneFleet, HomeOneTyped, HomeOneBgGrid, HomeOnePaddock, HomeOneFounder, HomeOneReveal } from "./HomeOneInteractions";
import shared from "./contact-design.module.css";
import glow from "./ambient-glow.module.css";
import s from "./home-one.module.css";

export default async function HomeOneDesign() {
  const { bikes, tracks, coaches } = await getHomeContent();
  return <div className={`${shared.page} ${s.page}`}><a href="#main-content" className={shared.skip}>Skip to content</a><PublicSiteHeader compact activePath="/" /><main id="main-content" className={glow.surface}>
    <section className={s.opening} aria-labelledby="home-one-title"><HomeOneBgGrid /><div className={`${s.wrap} ${s.openingIntro}`}><div className={s.headline}><h1 id="home-one-title">A few days.<br /><HomeOneTyped /></h1><div className={s.openingCopy}><p>Find your bike. Bring your people.<br />Make some time for the dirt.</p><p>A motocross experience built around how you want to ride. Bikes, tracks, gear, and coaching—brought together in one request.</p><Link href="/bikes" className={s.button}>Build your ride<FiArrowUpRight /></Link></div></div></div><HomeOneVideo /></section>

    <section id="the-ride" className={`${s.wrap} ${s.fleetSection}`} aria-labelledby="home-one-fleet"><HomeOneReveal className={s.sectionTop}><div><h2 id="home-one-fleet">Meet your<br /><em>next ride.</em></h2></div><Link className={s.button} href="/bikes">See all bikes<FiArrowUpRight /></Link></HomeOneReveal>{bikes === null ? <p className={s.empty}>Bikes are temporarily unavailable. <Link href="/bikes">Try the bike listings</Link></p> : <HomeOneFleet bikes={bikes} />}</section>

    <HomeOneReveal><HomeOnePaddock /></HomeOneReveal>

    <section className={`${s.wrap} ${s.destinations}`} aria-labelledby="home-one-tracks"><HomeOneReveal className={s.sectionTop}><div><h2 id="home-one-tracks">Some places<br /><em>just feel right.</em></h2></div><div><p>Find your corner of Southern California.<br />Choose a track, or leave that part for later.</p><Link className={s.button} href="/tracks">Explore all tracks<FiArrowUpRight /></Link></div></HomeOneReveal><div className={s.trackMosaic}>{tracks?.slice(0, 3).map((track, index) => <HomeOneReveal key={track.id} delay={index * 0.08} className={index === 0 ? s.trackLead : undefined}><Link href={`/tracks/${track.slug}`} className={s.trackTile}>{track.images[0] && <img src={track.images[0]} alt={track.name} loading="lazy" />}<span className={s.trackNumber}>0{index + 1}</span><div><small>{track.city}, California</small><h3>{track.name}</h3></div><span className={s.roundArrow}><FiArrowUpRight /></span></Link></HomeOneReveal>)}</div>{!tracks?.length && <p className={s.empty}>Track details are temporarily unavailable. <Link href="/tracks">View tracks</Link></p>}</section>

    <HomeOneReveal className={`${s.wrap} ${s.yourWay}`}>
      <div className={s.yourWayIntro}><h2>Leave room<br />for <em>your people.</em></h2><p>One set of dates. A bike for everyone. Add as many buddies as you have bikes for, with their own gear choices.</p><Link href="/bikes" className={s.button}>Bring your crew<FiArrowUpRight /></Link></div>
      <div className={s.yourWayImages}>
        <div className={s.crewImage}><img src="/images/home/img1.jpg" alt="MXSoCal rider at Cahuilla Creek" loading="lazy" /><span>Better stories start together.</span></div>
        <div className={`${s.crewImage} ${s.gearImage}`}><img src="/images/home/img2.jpg" alt="MXSoCal riders on the track" loading="lazy" /></div>
      </div>
    </HomeOneReveal>

    <section className={`${s.wrap} ${s.coaches}`} aria-labelledby="home-one-coaches"><HomeOneReveal className={s.sectionTop}><div><h2 id="home-one-coaches">Find your pace.<br /><em>Then find a little more.</em></h2></div><Link className={s.button} href="/coaches">Meet all coaches<FiArrowUpRight /></Link></HomeOneReveal><div className={s.coachGrid}>{coaches?.slice(0, 3).map((coach, index) => {
      const name = `${coach.firstName} ${coach.lastName}`;
      const book = `/contact-us?coach=${encodeURIComponent(coach.id)}&name=${encodeURIComponent(name)}`;
      return <HomeOneReveal key={coach.id} delay={index * 0.08}>
        <article className={s.coach}>
          <Link className={s.coachPhoto} href={book} aria-label={`Book a session with ${name}`}>
            {coach.profileImage && <img src={coach.profileImage} alt={name} loading="lazy" />}
            <span><span>Book Session<FiArrowUpRight /></span></span>
          </Link>
          <div>
            <h3>{name}</h3>
            <p>{coach.specialty || "Motocross coaching"}</p>
            <div className={s.coachMeta}>
              <span>{coach.dailyRate != null ? `${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(coach.dailyRate))} / day` : "Ask us about daily coaching"}</span>
              <Link href={book}>Book Session</Link>
            </div>
          </div>
        </article>
      </HomeOneReveal>;
    })}</div>{!coaches?.length && <p className={s.empty}>Contact our team to talk about coaching for your group.</p>}</section>

    <HomeOneReveal className={s.experience}>
      <div className={s.experienceImage}>
        <img src="/images/home/img4.jpg" alt="MXSoCal rider heading toward the motocross track" loading="lazy" />
        <svg className={s.experienceRoute} viewBox="0 0 1200 720" preserveAspectRatio="none" aria-hidden="true">
          <path d="M-40 570C130 470 165 680 324 570S520 330 670 442s147 50 250-18 179-12 330-130" />
          <circle cx="325" cy="570" r="8" />
          <circle cx="920" cy="424" r="8" />
        </svg>
      </div>
      <div className={s.experienceCopy}>
        <h2>From landing.<br />To <em>lining up.</em></h2>
        <p>A Southern California motocross day should start at the gate—not in a spreadsheet. We make that possible.</p>
      </div>
    </HomeOneReveal>

    <section className={s.journey} aria-labelledby="home-one-journey">
      <HomeOneReveal className={`${s.wrap} ${s.journeyIntro}`}>
        <h2 id="home-one-journey">Your ride,<br /><em>mapped out.</em></h2>
        <p>Four moves. One dirt day. We keep the path short so you can spend more of it on the bike.</p>
      </HomeOneReveal>
      <div className={s.journeyTrack} aria-hidden="true">
        <svg viewBox="0 0 1400 80" preserveAspectRatio="none">
          <path d="M40 40H1360" />
        </svg>
      </div>
      <div className={`${s.wrap} ${s.journeySteps}`} role="list">
        {[
          { n: "01", title: "Pick the bike", text: "Choose the machine you came to ride and lock in your dates.", img: "/images/home/img3.jpg", alt: "MXSoCal race-ready bike" },
          { n: "02", title: "Shape the day", text: "Add your crew, a track, gear, or coaching—only what fits.", img: "/images/home/img1.jpg", alt: "Riders preparing for a track day" },
          { n: "03", title: "We lock it in", text: "Our team confirms availability and handles the local details.", img: "/images/home/img2.jpg", alt: "MXSoCal riders on Southern California dirt" },
          { n: "04", title: "Show up & ride", text: "Arrive ready. The bike, the support, and the day are waiting.", img: "/images/home/img5.jpg", alt: "Rider lining up for a motocross day" },
        ].map((step, index) => (
          <HomeOneReveal key={step.n} delay={index * 0.07} className={s.journeyStep}>
            <article role="listitem">
              <div className={s.journeyPhoto}>
                <img src={step.img} alt={step.alt} loading="lazy" />
                <span>{step.n}</span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          </HomeOneReveal>
        ))}
      </div>
      <HomeOneReveal className={`${s.wrap} ${s.journeyCta}`}>
        <Link href="/bikes" className={s.button}>Start your ride<FiArrowUpRight /></Link>
      </HomeOneReveal>
    </section>

    <HomeOneReveal><HomeOneFounder /></HomeOneReveal>
  </main><PublicSiteFooter /></div>;
}
