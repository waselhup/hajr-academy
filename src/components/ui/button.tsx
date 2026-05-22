import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hajr-rose focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-hajr-navy text-white shadow-sm hover:bg-hajr-navy/90",
        cta: "bg-hajr-rose text-white shadow-sm hover:bg-hajr-rose/90",
        destructive: "bg-hajr-error text-white shadow-sm hover:bg-hajr-error/90",
        outline: "border border-hajr-navy bg-transparent text-hajr-navy hover:bg-hajr-navy/5",
        secondary: "bg-hajr-lavender text-hajr-navy hover:bg-hajr-lavender/80",
        ghost: "text-hajr-navy hover:bg-hajr-gray-100",
        link: "text-hajr-rose underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-lg px-8",
        pill: "h-11 rounded-full px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
