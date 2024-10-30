
import fs from 'fs';
import mkdirp from 'mkdirp';
import os from 'os';
import path from 'path';
import puppeteer from 'puppeteer';
import rimraf from 'rimraf';
import url from 'url';
import { config } from './config.js';
import { executionPath, __dirname } from './constants.js';

/*
 * https://github.com/microsoft/vscode/blob/ca4ceeb87d4ff935c52a7af0671ed9779657e7bd/extensions/markdown-language-features/src/slugify.ts#L26
 */
export function slugify(string) {
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

export function isExistsPath(path) {
  if (path?.length === 0) return false;

  try {
    fs.accessSync(path);
    return true;
  } catch (error) {
    console.error(error.message);
    return false;
  }
}

export function isExistsDir(dirname) {
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
    console.error(error.message);
    return false;
  }
}

export function deleteFile(path) {
  rimraf.sync(path);
}

export function getOutputDir(filePath, resourceUri) {
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

export function mkdir(path) {
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
export function readFile(filename, encoding='utf-8') {
 if (filename.length === 0) return '';

 if (filename.indexOf('file://') === 0) {
   if (process.platform === 'win32') {
     filename = filename.replace(/^file:\/\/\//, '')
       .replace(/^file:\/\//, '');
   } else {
     filename = filename.replace(/^file:\/\//, '');
   }
 }

 const filePath = filename.startsWith('/') 
   ? filename
   : path.join(__dirname, filename);

 if (isExistsPath(filePath)) {
   return fs.readFileSync(filePath, { encoding });
 } else {
   return '';
 }
}

export function convertImgPath(src, filename) {
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

export function checkPuppeteerBinary() {
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

export function setBooleanValue(a, b) {
  if (a === false) {
    return false
  } else {
    return a || b
  }
}