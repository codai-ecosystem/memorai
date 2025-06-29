import * as React from "react"
import { cn } from "@/lib/utils"
import { AlertCircle } from "lucide-react"

interface ErrorMessageProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string
}

const ErrorMessage = React.forwardRef<HTMLDivElement, ErrorMessageProps>(
  ({ className, message, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-2 text-sm text-destructive",
          className
        )}
        {...props}
      >
        <AlertCircle className="h-4 w-4" />
        <span>{message || children}</span>
      </div>
    )
  }
)
ErrorMessage.displayName = "ErrorMessage"

export { ErrorMessage }
