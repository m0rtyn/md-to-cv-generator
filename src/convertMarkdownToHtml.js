import cheerio from 'cheerio';
import grayMatter from "gray-matter";
import hljs from 'highlight.js';
import MarkdownIt from 'markdown-it';
import markdownItCheckbox from 'markdown-it-checkbox';
import markdownItContainer from 'markdown-it-container';
import markdownItInclude from 'markdown-it-include';
import markdownItNamedHeaders from 'markdown-it-named-headers';
import markdownItPlantuml from 'markdown-it-plantuml';
import path from 'path';
import { convertImgPath, setBooleanValue, slugify } from './utils.js';
import { config } from './config.js';

export function convertMarkdownToHtml(filename, type, text) {
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