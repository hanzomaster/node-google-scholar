import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer-extra';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';

export interface ArticleList {
  title: string;
  link: string;
  authors: string[];
  conference: string;
  year: number;
  cited_by: number;
  link_cited_by: string;
}

@Injectable()
export class AppService {
  async getPapers(url: string): Promise<ArticleList[]> {
    puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

    const browser = await puppeteer.launch({
      headless: true,
      defaultViewport: null,
      // executablePath: '/usr/bin/chromium-browser',
      // args: ['--no-sandbox', '--disable-gpu'],
    });
    const page = await browser.newPage();
    await page.goto(url);

    // Click 'Show More' until we reach the end of the list
    while (!(await page.$('button#gsc_bpf_more[disabled]'))) {
      await page.click('#gsc_bpf_more');
      await page.waitForTimeout(1500);
    }

    const data = await page.$$eval('tr.gsc_a_tr', (tr) => {
      return tr.map((el) => {
        const header = el.querySelector<HTMLElement>('td.gsc_a_t')!.innerText;
        const a = el.querySelector('a.gsc_a_at')!.getAttribute('href');
        const res = header.split('\n').map((text) => text.trim());
        const [title, authors, conference] = res;
        const author = authors.split(',').map((text) => text.trim());

        const cited_by = parseInt(
          el.querySelector('a.gsc_a_ac')!.textContent || '0',
        );

        const link_cited_by =
          el.querySelector('a.gsc_a_ac')!.getAttribute('href') || '';

        const year =
          parseInt(el.querySelector<HTMLElement>('td.gsc_a_y')!.innerText) || 0;

        return {
          title,
          link: `https://scholar.google.com/${a}`,
          authors: author,
          conference,
          year,
          cited_by,
          link_cited_by,
        };
      });
    });

    await browser.close();

    return data;
  }

  async getPaperInfos(url: string) {
    puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

    const browser = await puppeteer.launch({
      headless: true,
      defaultViewport: null,
      // executablePath: '/usr/bin/chromium-browser',
      // args: ['--no-sandbox', '--disable-gpu'],
    });
    const page = await browser.newPage();
    await page.goto(url);

    const header = await page.$eval('a.gsc_oci_title_link', (anchor) => ({
      Title: anchor.innerHTML,
      Link_to_original_paper: anchor.getAttribute('href') || '',
    }));

    const result: any = header;

    const data = await page.$$eval('div.gs_scl', (div) =>
      div.map((el) => {
        const field =
          el.querySelector<HTMLElement>('div.gsc_oci_field')!.innerText;
        const value =
          el.querySelector<HTMLElement>('div.gsc_oci_value')!.innerText;

        if (field === 'Authors') {
          return {
            field,
            value: value.split(',').map((text) => text.trim()),
          };
        }

        if (field === 'Total citations') {
          const res = value.split('\n').map((text) => text.trim());
          const [total_cited_by] = res;
          const link =
            el.querySelector<HTMLElement>('a')!.getAttribute('href') || '';
          const total_cited_by_num = parseInt(
            total_cited_by.match(/[\d\.]+/g)![0],
          );

          const cited_by_per_year = [
            ...el.querySelectorAll('a.gsc_oci_g_a'),
          ].map((a) => {
            const href = a.getAttribute('href')!;
            const year = parseInt(href.substring(href.lastIndexOf('=') + 1));
            const cited_by = parseInt(a.textContent!);
            return { year, cited_by };
          });
          return {
            field,
            cited_by: {
              total: total_cited_by_num,
              link,
              years: cited_by_per_year,
            },
          };
        }
        if (field === 'Scholar articles') {
          const res = value.split('\n').map((text) => text.trim());
          const links = [...el.querySelectorAll('a.gsc_oms_link')].map(
            (a) => a.getAttribute('href')!,
          );
          return {
            field,
            res,
            researcher_articles: links,
          };
        }
        return { field, value };
      }),
    );
    const await_data = await Promise.all(data);
    await_data.forEach((item) => {
      const [field, value] = Object.values(item);
      const fieldName: string = field.replace(/ /g, '_');

      result[fieldName] = value;
    });

    await browser.close();

    return result;
  }
}
