import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-hajr-navy text-white",
        success: "border-transparent bg-hajr-mint text-hajr-navy",
        info: "border-transparent bg-hajr-lavender text-hajr-navy",
        rose: "border-transparent bg-hajr-rose text-white",
        outline: "border-hajr-navy text-hajr-navy",
        danger: "border-transparent bg-hajr-rose text-white",
        warning: "border-transparent bg-hajr-warning/15 text-hajr-warning",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
