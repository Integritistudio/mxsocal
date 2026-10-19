import s from "./product-skeleton.module.css";
export default function ProductSkeleton() {
  return <div className={s.skeleton} role="status" aria-label="Loading product details" aria-busy="true">
    <span className={s.srOnly}>Loading product details…</span>
    <div aria-hidden="true"><div className={`${s.block} ${s.breadcrumb}`} /><div className={s.heading}><div><div className={`${s.block} ${s.title}`} /><div className={`${s.block} ${s.subtitle}`} /></div><div className={`${s.block} ${s.price}`} /></div><div className={s.badges}>{[0, 1, 2, 3].map(i => <div className={s.block} key={i} />)}</div>
      <div className={s.gallery}>{[0, 1, 2, 3, 4].map(i => <div className={s.block} key={i} />)}</div>
      <div className={s.body}><div><div className={`${s.block} ${s.sectionTitle}`} /><div className={s.overview}>{Array.from({ length: 12 }, (_, i) => <div className={`${s.block} ${s.line}`} key={i} />)}</div><div className={s.section}><div className={`${s.block} ${s.sectionTitle}`} />{[0, 1, 2, 3].map(i => <div className={`${s.block} ${s.line}`} key={i} />)}</div><div className={s.section}><div className={`${s.block} ${s.sectionTitle}`} />{[0, 1, 2].map(i => <div className={`${s.block} ${s.accordion}`} key={i} />)}</div></div><div className={s.booking}><div className={`${s.block} ${s.button}`} /><div className={`${s.block} ${s.button}`} /></div></div>
    </div>
  </div>;
}
