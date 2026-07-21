import { IsInt, IsNotEmpty } from 'class-validator';

export class SelectCountryDto {
  @IsInt()
  @IsNotEmpty()
  paisId: number;
}
