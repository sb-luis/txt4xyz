import * as React from "react"

import { cn } from "@/lib/utils"

export const sectionLabelClassName = "text-xs uppercase tracking-wide text-foreground/70"

function SectionLabel({
  as: Comp = "h3",
  className,
  ...props
}: React.ComponentProps<"h3"> & { as?: React.ElementType }) {
  return (
    <Comp
      data-slot="section-label"
      className={cn(sectionLabelClassName, className)}
      {...props}
    />
  )
}

export { SectionLabel }
