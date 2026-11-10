import Link from "next/link"
import { Search } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Logo } from "@/components/logo"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto grid h-14 max-w-screen-2xl grid-cols-[1fr_minmax(0,42rem)_1fr] items-center gap-4 px-4 md:px-6">
        <div className="justify-self-start">
            <Logo>
                <span className="hidden font-semibold tracking-tight sm:inline">PTE</span>
            </Logo>
        </div>

        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search cards..."
            className="h-9 bg-muted/50 pl-8"
          />
        </div>

        <Link
          href="/login"
          className={buttonVariants({ size: "sm", className: "justify-self-end" })}
        >
          Log in / Sign up
        </Link>
      </div>
    </header>
  )
}