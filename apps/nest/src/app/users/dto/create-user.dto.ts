import { IsEmail, IsString, Length } from 'class-validator';

export class CreateUserDto {
  @Length(4, 20)
  @IsString()
  username: string;

  @Length(4, 64)
  @IsString()
  password: string;

  @Length(6, 64)
  @IsEmail()
  email: string;
}
