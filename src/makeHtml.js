import mustache from "mustache";
import fs from "fs";
import { readFile } from "./utils.js";
import path from "path";
import { readStyles } from "./makeCss.js";

export function makeHtml(data, uri, customStylesPath) {
  try {
    // read styles
    var style = '';
    style += readStyles(uri, customStylesPath);

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


export function exportHtml(data, filePath) {
  fs.writeFile(filePath, data, 'utf-8', function (error) {
    if (error) {
      console.error('exportHtml()', error);
      return;
    }
  });
}