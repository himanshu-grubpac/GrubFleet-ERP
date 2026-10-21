export interface ValidationFieldError {
  field?: string;
  message: string;
}

/**
 * Turns class-validator / ValidationPipe message arrays into structured field errors.
 */
export function buildValidationErrorDetails(messages: string[]): {
  errors: ValidationFieldError[];
} {
  return { errors: messages.map(parseValidationMessage) };
}

function parseValidationMessage(message: string): ValidationFieldError {
  const unknownProperty = /^property (\S+) should not exist$/i.exec(message);
  if (unknownProperty) {
    return { field: unknownProperty[1], message };
  }

  const fieldPrefix = /^(\w[\w.]*) (must|should)/.exec(message);
  if (fieldPrefix) {
    return { field: fieldPrefix[1], message };
  }

  return { message };
}
