import { printErrorLog } from '@liyue.com/utils';

process.on('unhandledRejection', (e) => {
  // 监听promise错误
  printErrorLog(e, 'error')
})

process.on('uncaughtException', (e) => {
  printErrorLog(e, 'promiseError')
})