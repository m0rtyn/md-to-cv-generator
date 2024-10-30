import path from "path";
import { config } from "./config.js";
import { executionPath } from "./constants.js";
import { checkPuppeteerBinary, getOutputDir } from "./utils.js";
import puppeteer from "puppeteer";
import { exportHtml } from "./makeHtml.js";

export function exportPdf(data, filename, type, resourceUri) {
  if (!checkPuppeteerBinary()) {
    console.error('Chromium or Chrome does not exist! \
      See https://github.com/yzane/vscode-markdown-pdf#install');
    return;
  }

  var StatusbarMessageTimeout = config['StatusbarMessageTimeout'];

  var exportFilename = getOutputDir(filename, resourceUri);

  return (async () => {
    try {
      // export html
      if (type == 'html') {
        exportHtml(data, exportFilename);
        console.info('$(markdown) ' + exportFilename, StatusbarMessageTimeout);
        return;
      }

      // create temporary file
      var f = path.parse(filename);
      var tmpfilename = path.join(executionPath, `${f.name}_tmp.html`);

      exportHtml(data, tmpfilename);

      var options = {
        executablePath: puppeteer.executablePath(),
        args: ['--lang=' + 'en-US', '--no-sandbox', '--disable-setuid-sandbox']
        // Setting Up Chrome Linux Sandbox
        // https://github.com/puppeteer/puppeteer/blob/master/docs/troubleshooting.md#setting-up-chrome-linux-sandbox
      };
      const browser = await puppeteer.launch(options);
      const page = await browser.newPage();
      await page.setDefaultTimeout(0);
      await page.goto(new URL("file:///" + tmpfilename).toString(), { waitUntil: 'networkidle0' });

      // generate pdf
      // https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagepdfoptions
      if (type == 'pdf') {
        // If width or height option is set, it overrides the format option.
        // In order to set the default value of page size to A4, we changed it from the specification of puppeteer.
        var width_option = '';
        var height_option = '';
        var format_option = 'A4';

        if (!width_option && !height_option) {
          format_option = 'A4';
        }

        var landscape_option;
        if (config['orientation'] == 'landscape') {
          landscape_option = true;
        } else {
          landscape_option = false;
        }

        const options = {
          path: exportFilename,
          scale: config['scale'],
          displayHeaderFooter: config['displayHeaderFooter'],
          // headerTemplate: transformTemplate(''),
          // footerTemplate: transformTemplate(''),
          headerTemplate: `<h1>TEST</h1>`,
          footerTemplate: `<h6>TEST</h6>`,
          printBackground: config['printBackground'],
          landscape: landscape_option,
          pageRanges: config['pageRanges'] || '',
          format: format_option,
          width: '',
          height: '',
          margin: config['margin'],
          timeout: 0
        };
        // @ts-ignore
        await page.pdf(options);
      }

      await browser.close();

      // delete temporary file
      // var debug = config['debug'] || false;
      // if (!debug) {
      //   // if (isExistsPath(tmpfilename)) {
      //   //   deleteFile(tmpfilename);
      //   // }
      // }

      console.info('$(markdown) ' + exportFilename, StatusbarMessageTimeout);
    } catch (error) {
      console.error('exportPdf()', error);
    }
  })()
}