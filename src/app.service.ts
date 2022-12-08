import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer-extra';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import CitationItem from './dto/CitationItem.dto';
import CitationsDetail from './dto/CitationsDetail.dto';
import YearlyCitations from './dto/YearlyCitations.dto';

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
  async getTotalCitations(title: string): Promise<number> {
    const searchParams = new URLSearchParams({ q: title });
    const url = `https://scholar.google.com/scholar?${searchParams.toString()}&hl=en`;

    puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

    const browser = await puppeteer.launch({
      headless: true,
      defaultViewport: null,
      executablePath: '/usr/bin/chromium-browser',
      args: ['--no-sandbox', '--disable-gpu'],
    });
    const page = await browser.newPage();
    await page.goto(url);
    const totalCitations = await page.$$eval(
      '.gs_fl > a',
      (links: HTMLAnchorElement[]) =>
        links.find((anchor) => anchor.textContent?.includes('Cited by'))
          ?.textContent,
    );
    await browser.close();
    return totalCitations ? parseInt(totalCitations.split(' ')[2], 10) : 0;
  }

  async getCitationsEachYear(title: string): Promise<YearlyCitations[]> {
    const searchParams = new URLSearchParams({ q: title });
    const url = `https://scholar.google.com/scholar?${searchParams.toString()}&hl=en`;

    puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

    const browser = await puppeteer.launch({
      headless: true,
      defaultViewport: null,
      executablePath: '/usr/bin/chromium-browser',
      args: ['--no-sandbox', '--disable-gpu'],
    });
    const page = await browser.newPage();
    await page.goto(url);

    const link = await page.$$eval(
      '.gs_fl > a',
      (links: HTMLAnchorElement[]) =>
        links.find((anchor) => anchor.textContent?.includes('Cited by'))?.href,
    );

    const publishYear = await page.$eval(
      '.gs_a:nth-child(2)',
      (a: HTMLAnchorElement) => {
        const yearString = a.textContent?.split(',').pop()?.split(' ')[1];
        return yearString ? parseInt(yearString, 10) : new Date().getFullYear();
      },
    );
    const currentYear = new Date().getFullYear();

    if (link) {
      await page.goto(link);
    }

    const citationsByYear: YearlyCitations[] = [];
    let year = publishYear;
    do {
      const yearUrl = `${link}&as_ylo=${year}&as_yhi=${year}`;
      await Promise.all([
        await page.goto(yearUrl),
        // await page.waitForTimeout(Math.random() * 1000),
      ]);
      const fakeTotal = await page.$eval('#gs_ab_md', (div: HTMLDivElement) => {
        const str = div.textContent?.match(/\d+/g);
        return str ? parseInt(str[0], 10) : 0;
      });
      const start = fakeTotal > 80 ? Math.floor(fakeTotal / 10) * 10 - 20 : 0;
      await Promise.all([
        await page.goto(`${yearUrl}&start=${start}`),
        // await page.waitForTimeout(Math.random() * 1000),
      ]);
      const total = await page.$eval(
        '#gs_ab_md',
        (e: HTMLElement, start: number) => {
          const str = e.textContent?.match(/\d+/g);
          return str ? parseInt(str[start !== 0 ? 1 : 0], 10) : 0;
        },
        start,
      );

      citationsByYear.push({
        year,
        numberOfCitations: total,
      });
    } while (year++ < currentYear);

    await browser.close();
    return citationsByYear;
  }

  async getCitationsDetail(title: string): Promise<CitationsDetail> {
    const searchParams = new URLSearchParams({ q: title });
    const url = `https://scholar.google.com/scholar?${searchParams.toString()}&hl=en`;

    puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

    const browser = await puppeteer.launch({
      headless: true,
      defaultViewport: null,
      executablePath: '/usr/bin/chromium-browser',
      args: ['--no-sandbox', '--disable-gpu'],
    });
    const page = await browser.newPage();
    await page.goto(url);

    const { link, totalCitations } = await page.$$eval(
      '.gs_fl > a',
      (links: HTMLAnchorElement[]) => {
        const link = links.find((anchor) =>
          anchor.textContent?.includes('Cited by'),
        )?.href;
        const totalCitationsString = links.find((anchor) =>
          anchor.textContent?.includes('Cited by'),
        )?.textContent;
        const totalCitations = totalCitationsString
          ? parseInt(totalCitationsString.split(' ')[2], 10)
          : 0;
        return { link, totalCitations };
      },
    );
    if (link) {
      await page.goto(link);
    }

    let start = 0;
    const data: CitationItem[] = [];
    do {
      const dataPage: CitationItem[] = await page.$$eval(
        '.gs_r.gs_or.gs_scl',
        (citations) =>
          citations.map((citation) => {
            const url = [];
            const top: HTMLAnchorElement | null =
              citation.querySelector('.gs_rt > a');
            const title = top?.textContent;
            const baseUrl = top?.href;
            const rightUrl: HTMLAnchorElement | null =
              citation.querySelector('.gs_or_ggsm > a');
            if (rightUrl) {
              url.push(rightUrl.href);
            }
            if (baseUrl) {
              url.push(baseUrl);
            }
            const year = citation
              .querySelector('.gs_a')
              ?.textContent?.split(',')
              .pop()
              ?.split(' ')[1];

            let platformId = 0;
            citation
              .querySelectorAll('.gs_fl > a')
              .forEach((link: HTMLAnchorElement) => {
                if (link.textContent?.startsWith('Cited by')) {
                  const cites = link.href.match(/cites=(\d+)/);
                  platformId = cites ? parseInt(cites[1], 10) : 0;
                }
              });

            return {
              platformId,
              title: title || '',
              urls: url,
              year: year ? parseInt(year) : 0,
            };
          }),
      );
      data.unshift(...dataPage);
      start += 10;
    } while (start < totalCitations);

    await browser.close();
    return { total: totalCitations, detail: data };
  }

  async getPapers(url: string): Promise<ArticleList[]> {
    puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

    const browser = await puppeteer.launch({
      headless: true,
      defaultViewport: null,
      executablePath: '/usr/bin/chromium-browser',
      args: ['--no-sandbox', '--disable-gpu'],
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
      executablePath: '/usr/bin/chromium-browser',
      args: ['--no-sandbox', '--disable-gpu'],
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

        if (field === 'Authors' || field === 'Inventors') {
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
