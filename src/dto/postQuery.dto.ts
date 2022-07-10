import { IsString, IsUrl } from 'class-validator';

export class PostQueryDto {
  @IsString()
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_host: true,
  })
  url: string;
}
