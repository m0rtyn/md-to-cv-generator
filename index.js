#! /usr/bin/env node
import { mdToCvGenerator } from "./src/main.js";

const [format, fileToConvert] = process.argv.slice(2);

mdToCvGenerator(format, fileToConvert).then(console.log).catch(console.error)