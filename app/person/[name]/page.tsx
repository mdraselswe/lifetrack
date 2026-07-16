import { Suspense } from 'react'
import PersonView from './PersonView'

// Cache Components requires at least one build-time param to validate the
// dynamic segment. "_" prerenders a harmless placeholder shell; real person
// names resolve at request time (all data is client-side anyway).
export function generateStaticParams(): { name: string }[] {
  return [{ name: '_' }]
}

// Server shell: awaiting params counts as uncached data under Cache
// Components, so it must happen inside a Suspense boundary — otherwise the
// prerender of /person/[name] fails the build.
async function Resolved({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  return <PersonView personName={decodeURIComponent(name)} />
}

export default function PersonPage({ params }: { params: Promise<{ name: string }> }) {
  return (
    <Suspense fallback={null}>
      <Resolved params={params} />
    </Suspense>
  )
}
