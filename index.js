#! /usr/bin/env node
import { mdToCvGenerator } from "./src/main.js";
import yargs from 'yargs';
import fs from 'fs';

const argv = await yargs(process.argv.slice(2))
  .option('file', {
    alias: 'f',
    description: 'Relative path to the markdown file',
    type: 'string',
  })
  .option('styles', {
    alias: 's',
    description: 'Relative path to the css file',
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
  })
  .help()
  .argv

  
if (argv.watch) {
  if (!argv.dir || argv.dir === './') {
    console.error('Please provide a directory to watch other than the current directory');
    process.exit(1);
  }
  const directoryToWatch = argv.dir;
  console.log(`Watching for changes in ${directoryToWatch}...`);

  fs.watch(directoryToWatch, { recursive: true }, (eventType, filename) => {
    if (filename) {
      mdToCvGenerator('pdf', argv.file, argv.styles)
        .then(console.log)
        .catch(console.error)
    }
  });
}

mdToCvGenerator('pdf', argv.file, argv.styles)
  .then(console.log)
  .catch(console.error)