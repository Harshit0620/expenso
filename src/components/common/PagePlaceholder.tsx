import type { ReactNode } from 'react'

interface PagePlaceholderProps {
  title: string
  description?: string
  children?: ReactNode
}

/**
 * Minimal, reusable placeholder used while screens are being built.
 * It intentionally renders no financial data.
 */
export function PagePlaceholder({ title, description, children }: PagePlaceholderProps) {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </header>
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
        {children ?? 'This screen is not built yet.'}
      </div>
    </section>
  )
}
