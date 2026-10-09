import { z } from "zod"

const numericString = (label: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || (Number.isFinite(Number(v)) && Number(v) >= 0), `${label} must be a number >= 0`)

/** Validation for the Superba Cost SP create/edit form (values are kept as strings in the inputs). */
export const superbaCostSpFormSchema = z.object({
  legacySysId: z
    .string()
    .trim()
    .min(1, "Legacy Sys Id is required")
    .refine((v) => /^\d+$/.test(v) && Number.isSafeInteger(Number(v)) && Number(v) > 0, "Legacy Sys Id must be a positive whole number"),
  shadeCode: z.string().trim().min(1, "Shade code is required").max(50, "Max 50 characters"),
  colourName: z.string().trim().max(200, "Max 200 characters"),
  oldValue: numericString("Old value").refine((v) => v !== "", "Old value is required"),
  newValue: numericString("New value"),
  isActive: z.boolean(),
})

export type SuperbaCostSpFormValues = z.infer<typeof superbaCostSpFormSchema>
