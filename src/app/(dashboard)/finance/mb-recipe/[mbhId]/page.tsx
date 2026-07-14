import MbRecipeDetailClient from "./detail-client"

export default async function MbRecipeDetailPage({
  params,
}: {
  params: Promise<{ mbhId: string }>
}) {
  const { mbhId } = await params
  return <MbRecipeDetailClient mbhId={mbhId} />
}
