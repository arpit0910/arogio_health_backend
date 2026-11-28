import { Equals } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class DeleteAccountDto {
  @ApiProperty({
    example: true,
    description: 'Confirm soft deletion and the 30-day sign-in recovery period',
  })
  @Equals(true)
  confirm!: boolean;
}
