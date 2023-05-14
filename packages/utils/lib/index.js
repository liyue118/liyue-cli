'use strict';

import log from './log.js';
import isDebug from './isDebug.js';
import { makeList, makeInput, makePassword } from './inquirer.js';
import { getLatestVersion } from './npm.js';
import request from './request.js';
import Github from './git/Github.js';
import { getGitPlatform, clearCache } from './git/GitServer.js';
import { initGitServer, initGitType, createRemoteRepo } from './git/GitUtils.js'

function printErrorLog(e, type) {
  if(isDebug()){
    log.error(type, e)
  } else {
    log.error(type, e.message)
  }
} 
// log.http('request', 'request to: https://www.baidu.com')
// log.timing('request', '10s')
export {
  log,
  isDebug,
  makeList,
  makeInput,
  makePassword,
  getLatestVersion,
  printErrorLog,
  request,
  Github,
  getGitPlatform,
  initGitServer,
  initGitType,
  clearCache,
  createRemoteRepo,
};