import { AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

/** Warning callout listing calculation notes; renders nothing when empty. */
export function CalcNotesCallout({ notes }: { notes: string[] }) {
  if (notes.length === 0) return null
  return (
    <Alert className="border-amber-500/50 text-amber-700 dark:text-amber-400">
      <AlertTriangle className="size-4" />
      <AlertTitle>Calculation notes</AlertTitle>
      <AlertDescription>
        <ul className="list-disc pl-4">
          {notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
