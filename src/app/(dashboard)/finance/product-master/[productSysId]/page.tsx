import ProductMasterDetailClient from "./detail-client"

export default async function ProductMasterDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ productSysId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { productSysId } = await params
  const sp = await searchParams
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  return (
    <ProductMasterDetailClient
      productSysId={Number(productSysId)}
      initialTab={first(sp.tab)}
      highlightRm={first(sp.rm)}
    />
  )
}
