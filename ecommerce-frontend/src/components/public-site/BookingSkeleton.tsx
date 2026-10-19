import s from "./booking.module.css";
export default function BookingSkeleton({ scheduleOnly = false }: { scheduleOnly?: boolean }) {
  return <div className={s.skeleton} role="status" aria-label="Loading booking options" aria-busy="true">
    {!scheduleOnly && <><div className={s.skeletonSteps}>{[0, 1, 2, 3, 4, 5].map(i => <span key={i} />)}</div><div className={`${s.skeletonBlock} ${s.skeletonBike}`} /></>}
    <div className={s.skeletonSchedule}>{[0, 1, 2, 3, 4].map(i => <div key={i}><span className={s.skeletonBlock} />{[0, 1, 2].map(j => <span className={s.skeletonBlock} key={j} />)}</div>)}</div>
  </div>;
}
