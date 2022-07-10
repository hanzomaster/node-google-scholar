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
  getPaperInfos() {
    return this.appService.getPaperInfos(
      'https://scholar.google.com/citations?view_op=view_citation&hl=en&user=0FqthhoAAAAJ&citation_for_view=0FqthhoAAAAJ:M3ejUd6NZC8C',
    );
  }
}
