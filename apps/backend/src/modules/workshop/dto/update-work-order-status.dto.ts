import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdateWorkOrderStatusDto {
  @ApiProperty({
    enum: ['start', 'close', 'cancel'],
    description:
      'start: open → in_progress; close: open/in_progress → closed; cancel: open/in_progress → cancelled',
  })
  @IsIn(['start', 'close', 'cancel'])
  action!: 'start' | 'close' | 'cancel';
}
