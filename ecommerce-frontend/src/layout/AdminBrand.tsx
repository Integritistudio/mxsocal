import Image from "next/image";
import s from "./admin-theme.module.css";
export default function AdminBrand({ collapsed = false, small = false }: { collapsed?: boolean; small?: boolean }) {
 if (collapsed) return <span className={s.brandMark} title="MXSoCal">MX</span>;
 return <span className={s.brand}><Image src="/images/contact/2051f.png" alt="MXSoCal" width={small ? 110 : 140} height={small ? 45 : 58} priority /><small>Administration</small></span>;
}
