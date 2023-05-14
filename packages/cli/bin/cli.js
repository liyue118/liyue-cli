#!/usr/bin/env node

import importLocal from 'import-local';
import { log } from '@liyue.com/utils';
import entry from '../lib/index.js';
import { fileURLToPath } from 'node:url'
import { filename } from 'dirname-filename-esm';

// 输出  file:///Users/liyue/Desktop/.../lerna-repo/packages/cli/bin/cli.js
// console.log(import.meta.url)
// 方法1：将此url转成filename node:url  fileURLToPath
// const filename = fileURLToPath(import.meta.url);
// 方法2： dirname-filename-esm的包来解决 核心也是fileURLToPath
const __fileName = filename(import.meta)

// esm不能直接使用__fileName commonjs可以
if(importLocal(__fileName)){
  // 如果有本地脚手架版本，优先使用本地
  log.info('cli', '使用本次 liyue-cli版本')
} else {
  entry(process.argv.slice(2))
}