import { ViewerPage } from "@/components/bi/viewer/viewer-page"

export default async function BiViewerRoute({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  return <ViewerPage key={code} code={code} />
}
