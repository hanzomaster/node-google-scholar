import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { PostQueryDto } from './dto/postQuery.dto';
import { TitleQueryDto } from './dto/titleQuery.dto';

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

  @Get('/total')
  getTotalCitations(@Query() query: TitleQueryDto) {
    return this.appService.getTotalCitations(query.title);
  }

  @Get('/year')
  getCitationsEachYear(@Query() query: TitleQueryDto) {
    return this.appService.getCitationsEachYear(query.title);
  }

  @Get('/detail')
  getCitationsDetail(@Query() query: TitleQueryDto) {
    return this.appService.getCitationsDetail(query.title);
  }
}
