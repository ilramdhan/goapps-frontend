// PPC dashboard types (morning review, balance-for-sale, daily performance).

export type {
  MorningReviewMachineRow,
  MorningReviewIssue,
  MorningReviewPriority,
  GetMorningReviewRequest,
  GetMorningReviewResponse,
  BalanceForSaleRow,
  GetBalanceForSaleRequest,
  GetBalanceForSaleResponse,
  DailyPerformanceKpi,
  McEffCell,
  GetDailyPerformanceRequest,
  GetDailyPerformanceResponse,
} from "@/types/generated/ppc/v1/dashboard"

export {
  GetMorningReviewResponse as GetMorningReviewResponseParser,
  GetBalanceForSaleResponse as GetBalanceForSaleResponseParser,
  GetDailyPerformanceResponse as GetDailyPerformanceResponseParser,
} from "@/types/generated/ppc/v1/dashboard"

import type { AreaCode } from "@/types/generated/ppc/v1/common"

export interface MorningReviewParams {
  date: string
  area?: AreaCode
}

export interface BalanceForSaleParams {
  cpmProductSysId?: number
  commodityWatchOnly?: boolean
}

export interface DailyPerformanceParams {
  date: string
  area?: AreaCode
  excluding?: boolean
}
