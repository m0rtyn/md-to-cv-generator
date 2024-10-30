
import fs from 'fs';
import path from 'path';
import { executionPath } from './constants.js';
import { convertMarkdownToHtml } from './convertMarkdownToHtml.js';
import { exportPdf } from './exportPdf.js';
import { makeHtml } from './makeHtml.js';
import { isExistsPath } from './utils.js';

/**
 * 
 * @param {'pdf' | 'html' | 'jpeg' | 'all'} convertationType 
 * @param {string|null} fileToConvert 
 * @param {string|null} customStylesPath 
 * @returns 
 */
export async function mdToCvGenerator(convertationType = 'pdf', fileToConvert = null, customStylesPath = null) {
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

          var html = makeHtml(content, uri, customStylesPath);

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