import { IsString } from 'class-validator';

export class TitleQueryDto {
  @IsString()
  title: string;
}
