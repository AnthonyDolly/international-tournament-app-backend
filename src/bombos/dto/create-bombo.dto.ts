import { IsNotEmpty, IsString } from 'class-validator';

export class CreateBomboDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
