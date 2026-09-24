import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Skip JWT authentication for this route or controller. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
