import { IsString, Length } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @Length(4, 64)
  newPassword: string;

  @IsString()
  @Length(4, 64)
  currentPassword: string;
}
