import listing from "./coaches-design.module.css";
import s from "./listing-skeleton.module.css";

export function ListingCountSkeleton({ label }: { label: string }) {
  return <><span className={listing.srOnly}>{label}</span><span className={`${s.block} ${s.count}`} aria-hidden="true" /></>;
}

export default function ListingSkeleton({ variant, count = 4 }: { variant: "bike" | "coach"; count?: number }) {
  return <>{Array.from({ length: count }, (_, index) => <div className={`${listing.card} ${s.skeleton}`} aria-hidden="true" key={index}>
    <div className={`${listing.portrait} ${s.block}`} />
    <div className={s.info}>
      <div className={`${s.block} ${s.title}`} />
      {variant === "coach" ? <>
        <div className={s.group}><div className={`${s.block} ${s.label}`} /><div className={`${s.block} ${s.line}`} /></div>
        <div className={s.group}><div className={`${s.block} ${s.label}`} /><div className={`${s.block} ${s.line} ${s.short}`} /></div>
        <div className={s.group}><div className={`${s.block} ${s.label}`} /><div className={`${s.block} ${s.line}`} /><div className={`${s.block} ${s.line} ${s.short}`} /><div className={`${s.block} ${s.line}`} /></div>
        <div className={`${s.block} ${s.level}`} />
      </> : <>
        <div className={`${s.block} ${s.subtitle}`} />
        <div className={s.features}>{[0, 1, 2].map(item => <div key={item}><div className={`${s.block} ${s.icon}`} /><div className={`${s.block} ${s.featureLabel}`} /></div>)}</div>
        <div className={s.priceRow}><div><div className={`${s.block} ${s.price}`} /><div className={`${s.block} ${s.label}`} /></div><div className={`${s.block} ${s.detail}`} /></div>
      </>}
    </div>
    <div className={`${s.block} ${s.button}`} />
  </div>)}</>;
}
