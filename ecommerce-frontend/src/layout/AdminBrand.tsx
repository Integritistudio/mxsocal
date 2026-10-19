import Image from "next/image";

export default function AdminBrand({ collapsed = false, small = false }: { collapsed?: boolean; small?: boolean }) {
  if (collapsed) return <span title="MxSocal — powered by Integriti Studio" className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-sm font-bold text-white">Mx</span>;
  return <span className={`flex flex-col items-start ${small ? "gap-1" : "gap-2"}`}>
    <span className={`${small ? "text-lg" : "text-2xl"} font-bold leading-none text-gray-900 dark:text-white`}>MxSocal</span>
    <span className="text-[10px] leading-tight text-gray-500 dark:text-gray-400">Powered by Integriti Studio</span>
    <span className="inline-flex rounded-md bg-white px-2 py-1.5"><Image src="/images/logo/integriti-logo-nav.svg" alt="Integriti Studio" width={small ? 130 : 180} height={small ? 13 : 18} className="h-auto object-contain" priority /></span>
  </span>;
}
