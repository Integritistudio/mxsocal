import { DM_Sans } from "next/font/google";
const font = DM_Sans({ subsets: ["latin"], weight: ["300", "400", "500", "700"] });
export default function TracksLayout({ children }: { children: React.ReactNode }) { return <div className={font.className}>{children}</div>; }
