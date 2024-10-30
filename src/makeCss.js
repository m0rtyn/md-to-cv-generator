import path from "path";
import { executionPath } from "./constants.js";
import { config } from "./config.js";
import { readFile } from "./utils.js";

export function makeCss(filePath) {
  try {
    var css = readFile(filePath);
    if (css) {
      return '\n<style>\n' + css + '\n</style>\n';
    } else {
      return '';
    }
  } catch (error) {
    console.error('makeCss()', error);
  }
}

export function readStyles(uri, customStylesPath) {
  try {
    var includeDefaultStyles;
    var style = '';
    // var styles = [];
    var filePath = '';
    // var i;

    includeDefaultStyles = config['includeDefaultStyles'];

    // 1. read the style of the vscode.
    if (includeDefaultStyles) {
      filePath = path.join('styles', 'markdown.css');
      style += makeCss(filePath);

      // read the style of the markdown-pdf.
      filePath = path.join('styles', 'markdown-pdf.css');
      style += makeCss(filePath);

      filePath = path.join('styles', 'cv.css');
      style += makeCss(filePath);
    }

    // 3. read the style of the highlight.js.
    var highlightStyle = config['highlightStyle'] || '';
    var ishighlight = config['highlight'];
    if (ishighlight) {
      if (highlightStyle) {
        var css = config['highlightStyle'] || 'github.css';
        filePath = path.join('node_modules', 'highlight.js', 'styles', css);
        style += makeCss(filePath);
      } else {
        filePath = path.join('styles', 'tomorrow.css');
        style += makeCss(filePath);
      }
    }

    if (customStylesPath) {
      filePath = path.join(executionPath, customStylesPath);
      style += makeCss(filePath);
    }

    return style;
  } catch (error) {
    console.error('readStyles()', error);
  }
}