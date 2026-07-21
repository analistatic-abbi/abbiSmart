import { SetMetadata } from '@nestjs/common';

export const REQUIRE_WRITE_ACCESS_KEY = 'requireWriteAccess';

export const RequireWriteAccess = () =>
  SetMetadata(REQUIRE_WRITE_ACCESS_KEY, true);
