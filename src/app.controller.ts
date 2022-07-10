import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { PostQueryDto } from './dto/postQuery.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getPapers(@Query() query: PostQueryDto) {
    return this.appService.getPapers(query.url);
  }

  @Get('/example')
  getPaperInfos(@Query() query: PostQueryDto) {
    return this.appService.getPaperInfos(query.url);
  }
}
