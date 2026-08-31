import MbSpinDetailClient from "./detail-client"

export default async function MbSpinDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <MbSpinDetailClient id={id} />
}
