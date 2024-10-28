#! /usr/bin/env node
import { mdToCvGenerator } from "./src/main.js";
import yargs from 'yargs';
import fs from 'fs';

const argv = await yargs(process.argv.slice(2))
  .option('file', {
    alias: 'f',
    description: 'Realative path to the markdown file',
    type: 'string',
  })
  .option('styles', {
    alias: 's',
    description: 'Realative path to the custom styles file',
    type: 'string',
  })
  .option('watch', {
    alias: 'w',
    description: 'Watch for file changes',
    type: 'boolean',
  })
  .option('dir', {
    alias: 'd',
    description: 'Directory to watch',
    type: 'string',
    default: '.',
  })
  .help()
  .argv

  
if (argv.watch) {
  const directoryToWatch = argv.dir;
  console.log(`Watching for changes in ${directoryToWatch}...`);

  fs.watch(directoryToWatch, { recursive: true }, (eventType, filename) => {
    if (filename) {
      mdToCvGenerator('pdf', argv.file, argv.styles)
        .then(console.log)
        .catch(console.error)
    }
  });
} else {
  mdToCvGenerator('pdf', argv.file, argv.styles)
    .then(console.log)
    .catch(console.error)
}