/** Inline field validation message — matches Organisation form error styling. */

export const FORM_FIELD_INLINE_ERROR_CLASS = "mt-1 text-xs text-red-500";

export const FORM_CONTROL_ERROR_BORDER_CLASS =
  "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500/20";

export const FORM_COMPOSITE_SHELL_ERROR_BORDER_CLASS =
  "border-red-400 focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500/20";

export function mergeFormControlBorderClass(
  hasError: boolean,
  baseClass: string,
): string {
  return [baseClass, hasError ? FORM_CONTROL_ERROR_BORDER_CLASS : ""]
    .filter(Boolean)
    .join(" ");
}

export function mergeCompositeShellBorderClass(
  hasError: boolean,
  baseShellClass: string,
): string {
  return [
    baseShellClass,
    hasError ? FORM_COMPOSITE_SHELL_ERROR_BORDER_CLASS : "",
  ]
    .filter(Boolean)
    .join(" ");
}

type FormFieldInlineErrorProps = {
  message?: string;
  className?: string;
};

export function FormFieldInlineError({
  message,
  className,
}: FormFieldInlineErrorProps) {
  if (!message?.trim()) return null;
  return (
    <p
      className={[FORM_FIELD_INLINE_ERROR_CLASS, className]
        .filter(Boolean)
        .join(" ")}
      role="alert"
    >
      {message}
    </p>
  );
}
