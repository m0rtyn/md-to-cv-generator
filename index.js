#! /usr/bin/env node
import { mdToCvGenerator } from "./src/main.js";

const [format, fileToConvert] = process.argv.slice(2);
console.debug("🚀 ~ format, fileToConvert:", format, fileToConvert)

mdToCvGenerator(format, fileToConvert).then(console.log).catch(console.error)