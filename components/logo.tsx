import Link from "next/link"

export function Logo({ children }: { children?: React.ReactNode }) {
  return (
    <Link href="/" aria-label={children ? undefined : "Home"} className="logo-link">
      <span className="pokeball" aria-hidden />
      {children}
    </Link>
  )
}