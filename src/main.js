import cheerio from 'cheerio';
import fs from 'fs';
import grayMatter from "gray-matter";
import hljs from 'highlight.js';
import MarkdownIt from 'markdown-it';
import markdownItCheckbox from 'markdown-it-checkbox';
import markdownItContainer from 'markdown-it-container';
import markdownItInclude from 'markdown-it-include';
import markdownItNamedHeaders from 'markdown-it-named-headers';
import markdownItPlantuml from 'markdown-it-plantuml';
import mkdirp from 'mkdirp';
import mustache from 'mustache';
import os from 'os';
import path from 'path';
import puppeteer from 'puppeteer';
import rimraf from 'rimraf';
import url, { fileURLToPath } from 'url';
import { config } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const executionPath = process.cwd();

export async function mdToCvGenerator(convertationType = 'pdf', fileToConvert) {
  if (!fileToConvert) {
    console.error('File name does not get!');
    return;
  }

  try {

    // check markdown mode
    var uri = {
      fsPath: `${executionPath}/${fileToConvert}`
    };
    var mdfilename = uri.fsPath;
    var ext = path.extname(mdfilename);

    if (!isExistsPath(mdfilename)) {
      console.error('File name does not get!');
      return;
    }

    var types_format = ['html', 'pdf', 'png', 'jpeg'];
    var filename = '';
    var types = [];
    if (types_format.indexOf(convertationType) >= 0) {
      types[0] = convertationType;
    } else if (convertationType === 'settings') {
      var types_tmp = 'pdf';
      if (types_tmp && !Array.isArray(types_tmp)) {
        types[0] = types_tmp;
      } else {
        types = ['pdf'];
      }
    } else if (convertationType === 'all') {
      types = types_format;
    } else {
      console.error('markdownPdf().1 Supported formats: html, pdf, png, jpeg.');
      return;
    }

    // convert and export markdown to pdf, html, png, jpeg
    if (types && Array.isArray(types) && types.length > 0) {
      for (var i = 0; i < types.length; i++) {
        var type = types[i];
        if (types_format.indexOf(type) >= 0) {
          filename = mdfilename.replace(ext, '.' + type);

          // var text = editor.document.getText();
          const text = fs.readFileSync(mdfilename, 'utf-8');
          var content = convertMarkdownToHtml(mdfilename, type, text);

          var html = makeHtml(content, uri);
          console.debug("🚀 ~ mdToCvGenerator ~ html:", html)

          await exportPdf(html, filename, type, uri);
        } else {
          console.error('markdownPdf().2 Supported formats: html, pdf, png, jpeg.');
          return;
        }
      }
    } else {
      console.error('markdownPdf().3 Supported formats: html, pdf, png, jpeg.');
      return;
    }
  } catch (error) {
    console.error('markdownPdf()', error);
  }
}

// function markdownPdfOnSave() {
// }

// function isMarkdownPdfOnSaveExclude() {
// }

/*
 * convert markdown to html (markdown-it)
 */
function convertMarkdownToHtml(filename, type, text) {
  // console.debug("🚀 ~ convertMarkdownToHtml ~ filename:", filename, text)
  var matterParts = grayMatter(text);

  var statusbarmessage = console.info('$(markdown) Converting (convertMarkdownToHtml) ...');
  var breaks = setBooleanValue(matterParts.data.breaks, config['breaks']);
  let md = MarkdownIt({
    html: true,
    breaks: breaks,
    highlight: function (str, lang) {

      // if (lang && lang.match(/\bmermaid\b/i)) {
      //   return `<div class="mermaid">${str}</div>`;
      // }

      if (lang && hljs.default.getLanguage(lang)) {
        try {
          str = hljs.default.highlight(lang, str, true).value;
        } catch (error) {
          str = md.utils.escapeHtml(str);

          console.error('markdown-it:highlight', error);
        }
      } else {
        str = md.utils.escapeHtml(str);
      }
      return '<pre class="hljs"><code><div>' + str + '</div></code></pre>';
    }
  });

  // if (md?.renderer?.rules?.image) throw Error('md.renderer.rules.image is defined');

  try {
    // convert the img src of the markdown
    var defaultRender = md.renderer.rules.image;

    if (!defaultRender) throw Error('defaultRender is not defined');

    md.renderer.rules.image = function (tokens, idx, options, env, self) {
      var token = tokens[idx];
      var href = token?.attrs?.[token.attrIndex('src')][1] || '';

      if (type === 'html') {
        href = decodeURIComponent(href).replace(/("|')/g, '');
      } else {
        href = convertImgPath(href, filename);
      }

      // console.log("converted href: " + href);
      if (!token?.attrs) return '';
      token.attrs[token.attrIndex('src')][1] = href;

      // pass token to default renderer.
      return defaultRender?.(tokens, idx, options, env, self) || '';
    };

    if (type !== 'html') {
      // convert the img src of the html
      md.renderer.rules.html_block = function (tokens, idx) {
        var html = tokens[idx].content;
        var $ = cheerio.load(html);

        $('img').each(function () {
          var src = $(this).attr('src');
          var href = convertImgPath(src, filename);
          $(this).attr('src', href);
        });

        return $.html();
      };
    }

    // checkbox
    md.use(markdownItCheckbox);

    let options = {
      slugify: slugify
    }

    // emoji
    // var emoji_f = setBooleanValue(matterParts.data.emoji, config['emoji']);
    // if (config['emoji']) {
    //   // var emojies_defs = require(path.join(__dirname, '_emoji.json'));
    //   // options.defs = emojies_defs

    //   const mdItEmoji = require('markdown-it-emoji')

    //   // md.use(mdItEmoji.light, options);

    //   md.renderer.rules.emoji = function (token, idx) {
    //     var emoji = token[idx].markup;
    //     var emojipath = path.join(__dirname, 'node_modules', 'emoji-images', 'pngs', emoji + '.png');
    //     var emojidata = readFile(emojipath, null).toString('base64');
    //     if (emojidata) {
    //       return '<img class="emoji" alt="' + emoji + '" src="data:image/png;base64,' + emojidata + '" />';
    //     } else {
    //       return ':' + emoji + ':';
    //     }
    //   };
    // }

    // toc
    // https://github.com/leff/markdown-it-named-headers
    md.use(markdownItNamedHeaders, options);

    // markdown-it-container
    // https://github.com/markdown-it/markdown-it-container
    md.use(markdownItContainer, '', {
      validate: function (name) {
        return name.trim().length;
      },
      render: function (tokens, idx) {
        if (tokens[idx].info.trim() !== '') {
          return `<div class="${tokens[idx].info.trim()}">\n`;
        } else {
          return `</div>\n`;
        }
      }
    });

    // PlantUML
    // https://github.com/gmunguia/markdown-it-plantuml
    var plantumlOptions = {
      openMarker: matterParts.data.plantumlOpenMarker || config['plantumlOpenMarker'] || '@startuml',
      closeMarker: matterParts.data.plantumlCloseMarker || config['plantumlCloseMarker'] || '@enduml',
      server: config['plantumlServer'] || ''
    }
    md.use(markdownItPlantuml, plantumlOptions);

    // markdown-it-include
    // https://github.com/camelaissani/markdown-it-include
    // the syntax is :[alt-text](relative-path-to-file.md)
    // https://talk.commonmark.org/t/transclusion-or-including-sub-documents-for-reuse/270/13
    if (config['markdown-it-include']['enable']) {
      md.use(markdownItInclude, {
        root: path.dirname(filename),
        includeRe: /:\[.+\]\((.+\..+)\)/i
      });
    }

    return md.render(matterParts.content);
  } catch (error) {
    console.error('convertMarkdownToHtml()', error);
  }
}

/*
 * https://github.com/microsoft/vscode/blob/ca4ceeb87d4ff935c52a7af0671ed9779657e7bd/extensions/markdown-language-features/src/slugify.ts#L26
 */
function slugify(string) {
  try {
    var stg = encodeURI(
      string.trim()
        .toLowerCase()
        .replace(/\s+/g, '-') // Replace whitespace with -
        .replace(/[\]\[\!\'\#\$\%\&\(\)\*\+\,\.\/\:\;\<\=\>\?\@\\\^\_\{\|\}\~\`。，、；：？！…—·ˉ¨‘’“”々～‖∶＂＇｀｜〃〔〕〈〉《》「」『』．〖〗【】（）［］｛｝]/g, '') // Remove known punctuators
        .replace(/^\-+/, '') // Remove leading -
        .replace(/\-+$/, '') // Remove trailing -
    );
    return stg;
  } catch (error) {
    console.error('Slug()', error);
  }
}


/*
 * make html
 */
function makeHtml(data, uri) {
  try {
    // read styles
    var style = '';
    style += readStyles(uri);

    // get title
    var title = path.basename(uri.fsPath);

    // read template
    var filename = './template.html';
    var templateHtml = readFile(filename).toString();

    // read mermaid javascripts
    // var mermaidServer = '';
    // var mermaid = '<script src=\"' + mermaidServer + '\"></script>';

    // compile template

    var view = {
      title: title,
      style: style,
      content: data,
      // mermaid: mermaid
    };
    return mustache.render(templateHtml, view);
  } catch (error) {
    console.error('makeHtml()', error);
  }
}

/*
 * export a html to a html file
 */
function exportHtml(data, filePath) {
  console.debug("🚀 ~ exportHtml ~ data, filePath:", data, filePath)
  fs.writeFile(filePath, data, 'utf-8', function (error) {
    if (error) {
      console.error('exportHtml()', error);
      return;
    }
  });
}

/*
 * export a html to a pdf file (html-pdf)
 */
function exportPdf(data, filename, type, resourceUri) {
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

/**
 * Transform the text of the header or footer template, replacing the following supported placeholders:
 *
 * - `%%ISO-DATETIME%%` – For an ISO-based date and time format: `YYYY-MM-DD hh:mm:ss`
 * - `%%ISO-DATE%%` – For an ISO-based date format: `YYYY-MM-DD`
 * - `%%ISO-TIME%%` – For an ISO-based time format: `hh:mm:ss`
 */
function transformTemplate(templateText) {
  if (templateText.indexOf('%%ISO-DATETIME%%') !== -1) {
    templateText = templateText.replace('%%ISO-DATETIME%%', new Date().toISOString().substr(0, 19).replace('T', ' '));
  }

  if (templateText.indexOf('%%ISO-DATE%%') !== -1) {
    templateText = templateText.replace('%%ISO-DATE%%', new Date().toISOString().substr(0, 10));
  }

  if (templateText.indexOf('%%ISO-TIME%%') !== -1) {
    templateText = templateText.replace('%%ISO-TIME%%', new Date().toISOString().substr(11, 8));
  }

  return templateText;
}

function isExistsPath(path) {
  if (path?.length === 0) return false;

  try {
    fs.accessSync(path);
    return true;
  } catch (error) {
    console.warn(error.message);
    return false;
  }
}

function isExistsDir(dirname) {
  if (dirname.length === 0) {
    return false;
  }
  try {
    if (fs.statSync(dirname).isDirectory()) {
      return true;
    } else {
      console.warn('Directory does not exist!');
      return false;
    }
  } catch (error) {
    console.warn(error.message);
    return false;
  }
}

function deleteFile(path) {
  rimraf.sync(path);
}

function getOutputDir(filePath, resourceUri) {
  try {
    var outputDir;
    if (resourceUri === undefined) {
      return filePath;
    }
    
    var outputDirectory = config['outputDirectory'] || '';
    if (outputDirectory.length === 0) {
      return filePath
    }

    // Use a home directory relative path If it starts with ~.
    if (outputDirectory.indexOf('~') === 0) {
      outputDir = outputDirectory.replace(/^~/, os.homedir());
      mkdir(outputDir);
      return path.join(outputDir, path.basename(filePath));
    }

    // Use path if it is absolute
    if (path.isAbsolute(outputDirectory)) {
      if (!isExistsDir(outputDirectory)) {
        console.error(`The output directory specified by the markdown-pdf.outputDirectory option does not exist.\
          Check the markdown-pdf.outputDirectory option. ` + outputDirectory);
        return;
      }
      return path.join(outputDirectory, path.basename(filePath));
    }

    // Use a workspace relative path if there is a workspace and markdown-pdf.outputDirectoryRootPath = workspace
    var outputDirectoryRelativePathFile = config['outputDirectoryRelativePathFile'];

    let root = {
      uri: {
        fsPath: './'
      },
    }
    if (outputDirectoryRelativePathFile === false) {
      mkdir(outputDir);
      return path.join(executionPath, path.basename(filePath));
    }

    // Otherwise look relative to the markdown file
    // mkdir(outputDir);
    return path.join(executionPath, path.basename(filePath));
  } catch (error) {
    console.error('getOutputDir()', error);
  }
}

function mkdir(path) {
  if (isExistsDir(path)) {
    return;
  }
  return mkdirp.sync(path);
}

/**
 * 
 * @param {*} filename 
 * @param {'utf-8'} encoding 
 * @returns 
 */
function readFile(filename, encoding='utf-8') {
  if (filename.length === 0) return '';

  if (filename.indexOf('file://') === 0) {
    if (process.platform === 'win32') {
      filename = filename.replace(/^file:\/\/\//, '')
        .replace(/^file:\/\//, '');
    } else {
      filename = filename.replace(/^file:\/\//, '');
    }
  }

  const filePath = path.join(__dirname, filename)

  if (isExistsPath(filePath)) {
    return fs.readFileSync(filePath, { encoding });
  } else {
    return '';
  }
}

function convertImgPath(src, filename) {
  try {
    var href = decodeURIComponent(src);
    href = href.replace(/("|')/g, '')
      .replace(/\\/g, '/')
      .replace(/#/g, '%23');
    var protocol = url.parse(href).protocol;
    if (protocol === 'file:' && href.indexOf('file:///') !== 0) {
      return href.replace(/^file:\/\//, 'file:///');
    } else if (protocol === 'file:') {
      return href;
    } else if (!protocol || path.isAbsolute(href)) {
      href = path.resolve(path.dirname(filename), href).replace(/\\/g, '/')
        .replace(/#/g, '%23');
      if (href.indexOf('//') === 0) {
        return 'file:' + href;
      } else if (href.indexOf('/') === 0) {
        return 'file://' + href;
      } else {
        return 'file:///' + href;
      }
    } else {
      return src;
    }
  } catch (error) {
    console.error('convertImgPath()', error);
  }
}

function makeCss(filename) {
  try {
    var css = readFile(filename);
    if (css) {
      return '\n<style>\n' + css + '\n</style>\n';
    } else {
      return '';
    }
  } catch (error) {
    console.error('makeCss()', error);
  }
}

function readStyles(uri) {
  try {
    var includeDefaultStyles;
    var style = '';
    var styles = [];
    var filename = '';
    var i;

    includeDefaultStyles = config['includeDefaultStyles'];

    // 1. read the style of the vscode.
    if (includeDefaultStyles) {
      filename = path.join(__dirname, 'styles', 'markdown.css');
      style += makeCss(filename);
    }

    // 2. read the style of the markdown.styles setting.
    if (includeDefaultStyles) {
      styles = config['styles'];
      if (styles?.length > 0) {
        for (i = 0; i < styles.length; i++) {
          style += `<link rel="stylesheet" href="${path.join(__dirname, styles[i])}" type="text/css">`;
        }
      }
    }

    // 3. read the style of the highlight.js.
    var highlightStyle = config['highlightStyle'] || '';
    var ishighlight = config['highlight'];
    if (ishighlight) {
      if (highlightStyle) {
        var css = config['highlightStyle'] || 'github.css';
        filename = path.join(__dirname, 'node_modules', 'highlight.js', 'styles', css);
        style += makeCss(filename);
      } else {
        filename = path.join(__dirname, 'styles', 'tomorrow.css');
        style += makeCss(filename);
      }
    }

    // 4. read the style of the markdown-pdf.
    if (includeDefaultStyles) {
      filename = path.join(__dirname, 'styles', 'markdown-pdf.css');
      style += makeCss(filename);
    }

    // 5. read the style of the markdown-pdf.styles settings.
    styles = config['styles'];
    if (styles?.length > 0) {
      for (i = 0; i < styles.length; i++) {
        style += `<link rel="stylesheet" href="${path.join(__dirname, styles[i])}" type="text/css">`;
      }
    }

    return style;
  } catch (error) {
    console.error('readStyles()', error);
  }
}

function checkPuppeteerBinary() {
  try {
    // settings.json
    var executablePath = config['executablePath'] || ''

    // bundled Chromium
    executablePath = puppeteer.executablePath();

    if (isExistsPath(executablePath)) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error('checkPuppeteerBinary()', error);
  }
}

function setBooleanValue(a, b) {
  if (a === false) {
    return false
  } else {
    return a || b
  }
}