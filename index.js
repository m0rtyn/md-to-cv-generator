#! /usr/bin/env node
import { mdToCvGenerator } from "./src/main.js";

const [fileToConvert] = process.argv.slice(2);

mdToCvGenerator('pdf', fileToConvert).then(console.log).catch(console.error)