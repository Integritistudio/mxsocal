/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Swiper, SwiperSlide } from "swiper/react";
import { A11y, Keyboard } from "swiper/modules";
import type { Swiper as SwiperInstance } from "swiper";
import "swiper/css";
import { gsap } from "gsap";
import { FiCheck, FiArrowUpRight, FiVolume2, FiVolumeX } from "react-icons/fi";
import Link from "next/link";
import { PublicSiteHeader, PublicSiteFooter } from "./PublicSiteChrome";
import shared from "./contact-design.module.css";
import s from "./about-design.module.css";

const asset = (file: string) => `/images/about/${file}`;
const benefits = [
  ["7649b.png", "Pro-Grade Craftsmanship", "Every product is engineered with high-strength materials to deliver consistent performance on tough terrains"],
  ["4eeb0.png", "Advanced Safety Standards", "Our helmets and gear undergo rigorous testing to ensure maximum protection during high-intensity rides"],
  ["5b45b.png", "Fast & Reliable Delivery", "We prioritize quick global shipping so riders get their equipment exactly when they need it"],
  ["8939c.png", "Dedicated Rider Support", "Our team provides expert assistance to help you choose, maintain, and optimize your riding gear"],
];
const reviews = [
  { title: "Real Track Progress", quote: "The MXSoCal bikes are absolutely insane! Smooth rides, amazing power and the gear keeps me completely safe on every trail I hit.", name: "Alex M.", role: "Motocross Rider", image: "467ad.png" },
  { title: "Built for Confidence", quote: "I’ve never felt more confident on the track. The helmets and apparel from MXSoCal are top-notch and built for serious riders.", name: "Derek L.", role: "Youth Rider Parent", image: "73eb2.png" },
  { title: "Easy Riding Experience", quote: "Fast delivery, incredible customer support, and bikes that perform beyond expectations. MXSoCal truly nailed every detail of my riding experience.", name: "Ryan K.", role: "Weekend Trail Rider", image: "04e3b.png" },
];
const faqs: { question: string; answer: ReactNode }[] = [
  { question: "Do you ship dirt bikes internationally?", answer: "Yes, we ship to most countries worldwide. Shipping times and costs vary based on your location, and our team will provide full details during checkout." },
  { question: "Are your bikes covered under warranty?", answer: <>Warranty coverage depends on the bike and manufacturer. <a href="/contact-us">Contact our team</a> for the coverage and terms for your chosen model.</> },
  { question: "How do I choose the right bike for my experience level?", answer: <>Consider your riding experience, height, and the terrain you plan to ride. <a href="/contact-us">Talk to our team</a> for help finding the right fit.</> },
  { question: "Can I return or exchange a product?", answer: <>Please <a href="/contact-us">contact our team</a> with your order details to confirm return or exchange eligibility and the next steps.</> },
  { question: "Do you offer customer support for bike maintenance?", answer: <><a href="/contact-us">Get in touch</a> with your bike model and maintenance question so our team can help.</> },
];
function Photo({ base, image, className, alt }: { base: string; image: string; className: string; alt: string }) {
  const images = <><img className={s.photoBase} src={asset(base)} alt="" loading="lazy" /><img className={s.photoTop} src={asset(image)} alt={alt} loading="lazy" /></>;
  if (className === s.featurePhoto) return <div className={`${s.photo} ${className}`}>{images}</div>;
  return <Link href="/stories" className={`${s.photo} ${s.storyPhoto} ${className}`} aria-label={`Visit stories — ${alt}`}>{images}<span className={s.storyOverlay}><span>Visit Stories<FiArrowUpRight size={20} aria-hidden="true" /></span></span></Link>;
}
function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return <motion.section className={className} initial={false} whileInView={reduced ? undefined : { y: [8, 0] }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.section>;
}
export default function AboutDesign() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const reviewSlider = useRef<SwiperInstance | null>(null);
  const page = useRef<HTMLDivElement>(null);
  const light = useRef<HTMLDivElement>(null);
  const experience = useRef<HTMLVideoElement>(null);
  const playButton = useRef<HTMLButtonElement>(null);
  const [videoStarted, setVideoStarted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(true);
  const [videoError, setVideoError] = useState("");
  async function playExperience() {
    setVideoError("");
    try { await experience.current?.play(); }
    catch { setVideoError("The video couldn’t start. Please try again."); }
  }
  function stopExperience() {
    const video = experience.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
      video.muted = true;
    }
    setVideoStarted(false);
    setVideoMuted(true);
    setVideoError("");
    requestAnimationFrame(() => playButton.current?.focus({ preventScroll: true }));
  }
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => { gsap.to(light.current, { x: 10, y: -6, duration: 15, repeat: -1, yoyo: true, ease: "sine.inOut" }); }, page);
    return () => media.revert();
  }, []);
  return <div className={`${shared.page} ${s.page}`} ref={page}>
    <a className={shared.skip} href="#main-content">Skip to content</a>
    <PublicSiteHeader activePath="/about-us" />
    <main id="main-content" className={s.main}>
      <div ref={light} className={s.lightOne} aria-hidden="true"><div><div className={s.lightAsset}><img src={asset("7e47f.svg")} alt="" width="3094.81" height="2562.4" /></div></div></div>
      <div className={s.lightTwo} aria-hidden="true"><div><div className={s.lightAsset}><img src={asset("dc992.svg")} alt="" width="3094.81" height="2562.4" /></div></div></div>
      <section className={`${s.container} ${s.intro}`} aria-labelledby="about-heading">
        <div><h1 id="about-heading">About Us</h1><h2>Where Off-Road Passion, Quality Craftsmanship and Rider Trust Come Together</h2></div>
        <div className={s.introCopy}><p>At MXSoCal, we’re more than a dirt bike store, we’re a community built by riders, for riders. What started as a simple love for off-road freedom has grown into a dedicated hub for high-performance bikes, premium gear and an unmatched riding experience. Every product we offer is carefully selected to ensure riders get the perfect balance of power, durability and safety, no matter where the trail leads.</p><p>Whether you&apos;re just starting out or pushing limits on the track, we’re here to support your journey. From reliable bikes to top-tier gear. We deliver products and service that help riders get more out of every adventure.</p></div>
      </section>
      <Reveal className={`${s.container} ${s.collage}`}>
        <div className={s.experienceCount}><strong>10+</strong><span>Years of MX<br />Experience</span></div>
        <Photo className={s.photoSmall} base="eb879.png" image="357e3.png" alt="Rider leaning into a dirt-track turn" />
        <Photo className={s.photoTall} base="a89c9.png" image="26411.png" alt="Motocross rider carving through a muddy corner" />
        <Photo className={s.photoWide} base="3256a.png" image="edd38.png" alt="Rider kicking up dust on a motocross track" />
        <Photo className={s.photoWheel} base="9fd50.png" image="54bae.png" alt="Close-up of an off-road motorcycle tire" />
        <Photo className={s.photoBike} base="ddebc.png" image="59326.png" alt="Dirt bike and rider ready for the next adventure" />
      </Reveal>
      <Reveal className={`${s.container} ${s.benefits}`}><h2>Why Choose Us?</h2><div className={s.benefitGrid}>{benefits.map(([image, title, copy]) => <article key={title}><img src={asset(image)} alt="" width="60" height="60" loading="lazy" /><h3>{title}</h3><p>{copy}</p></article>)}</div></Reveal>
      <Reveal className={`${s.wide} ${s.commitment}`}>
        <div className={s.experiencePhoto}>
          <Photo className={s.featurePhoto} base="3ff1b.png" image="2924d.png" alt="Motocross riders taking on a forest jump" />
          <video ref={experience} className={`${s.experienceVideo} ${videoStarted ? s.videoVisible : ""}`} src="/videos/herosection.mp4" loop muted={videoMuted} playsInline preload="none" controls={false} disablePictureInPicture disableRemotePlayback aria-label="MXSoCal riding experience" onPlaying={() => setVideoStarted(true)} onError={() => { setVideoStarted(false); setVideoError("The video couldn’t load. Please try again shortly."); }} />
          {!videoStarted && <button ref={playButton} className={s.play} type="button" aria-label="Play the MXSoCal riding experience" onClick={playExperience}><img src={asset("0ef00.svg")} alt="" /></button>}
          {videoStarted && <button className={s.videoStop} type="button" aria-label="Stop video and return to preview" onClick={stopExperience} />}
          {videoStarted && <button className={s.videoSound} type="button" aria-label={videoMuted ? "Unmute video" : "Mute video"} onClick={() => setVideoMuted(muted => !muted)}>{videoMuted ? <FiVolumeX size={21} aria-hidden="true" /> : <FiVolume2 size={21} aria-hidden="true" />}</button>}
          {videoError && <p className={s.videoError} role="status">{videoError}</p>}
        </div>
        <div className={s.commitmentCopy}><h2>Committed To Delivering The Best Riding Experience</h2><p>Everything we create, source and deliver is built around one goal. Helping riders get the performance, safety and reliability they need on every trail and track.</p><ul>{["Premium bikes and gear selected for real-world durability", "Expert guidance to help riders choose the right equipment", "A customer-first approach focused on trust and long-term value"].map(item => <li key={item}><span className={s.checkCircle}><FiCheck size={15} strokeWidth={2.5} aria-hidden="true" /></span>{item}</li>)}</ul><a className={s.cta} href="/contact-us">Learn More<img src={asset("3f168.svg")} alt="" /></a></div>
      </Reveal>
      <section className={`${s.wide} ${s.stats}`} aria-label="MXSoCal in numbers">{[["12k+", "Riders Equipped"], ["850+", "Bikes Sold"], ["4.9/5", "Average Customer Rating"], ["22 Countries", "Shipping Worldwide"]].map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</section>
      <Reveal className={`${s.wide} ${s.testimonials}`}><div className={s.reviewHeading}><h2>What Our Customers Say</h2><p>Rated 4.7 / 5 based on 28,370 reviews Showing our 4 &amp; 5 star reviews</p></div><Swiper className={s.reviewViewport} modules={[A11y, Keyboard]} onSwiper={swiper => { reviewSlider.current = swiper; }} slidesPerView={1} slidesPerGroup={1} spaceBetween={20} breakpoints={{ 851: { slidesPerView: 3, spaceBetween: 20 }, 1201: { slidesPerView: 3, spaceBetween: 30 } }} loop speed={reduceMotion ? 0 : 650} keyboard={{ enabled: true, onlyInViewport: true }} a11y={{ containerMessage: "Customer reviews", itemRoleDescriptionMessage: "Customer review" }} grabCursor>
        {[...reviews, ...reviews].map((review, index) => <SwiperSlide className={s.reviewSlide} key={review.name + index}><article className={s.review}><h3>{review.title}</h3><img className={s.quoteIcon} src={asset("eedd3.png")} alt="" width="37" height="26" /><p>{review.quote}</p><div className={s.reviewer}><img src={asset(review.image)} alt="" width="60" height="60" loading="lazy" /><div><strong>{review.name}</strong><span>{review.role}</span></div></div></article></SwiperSlide>)}
      </Swiper><div className={s.reviewControls}><button type="button" aria-label="Previous reviews" onClick={() => reviewSlider.current?.slidePrev()}><img src={asset("01665.svg")} alt="" /></button><button type="button" aria-label="Next reviews" onClick={() => reviewSlider.current?.slideNext()}><img src={asset("01665.svg")} alt="" /></button></div></Reveal>
      <section className={s.faq} aria-labelledby="faq-heading"><h2 id="faq-heading">See Frequently Asked Questions</h2><div>{faqs.map((faq, index) => <article className={openFaq === index ? s.faqOpen : s.faqItem} key={faq.question}><h3><button type="button" aria-expanded={openFaq === index} aria-controls={`about-faq-${index}`} id={`about-question-${index}`} onClick={() => setOpenFaq(openFaq === index ? null : index)}>{faq.question}<img src={asset(openFaq === index ? "e1bdc.svg" : "7371c.svg")} alt="" /></button></h3><motion.div id={`about-faq-${index}`} role="region" aria-labelledby={`about-question-${index}`} inert={openFaq !== index} initial={false} animate={{ height: openFaq === index ? "auto" : 0, opacity: openFaq === index ? 1 : 0 }} transition={{ duration: reduceMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }} className={s.faqAnswer}><p>{faq.answer}</p></motion.div></article>)}</div></section>
    </main>
    <PublicSiteFooter />
  </div>;
}
