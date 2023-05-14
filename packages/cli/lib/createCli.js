import path from 'node:path';
import { program } from 'commander';
// esm不支持importpackage json
// import pkg from '../package.json';
import { dirname } from 'dirname-filename-esm';
import { log } from '@liyue.com/utils';
// 读取json文件
import fse from 'fs-extra';
import semver from 'semver';
// commonjs => esmodule 1. 可以使用await import 并在then里面拿到实例
// const chalk = import('chalk').then(chalk => {});
import chalk from 'chalk';

const __dirname = dirname(import.meta);
const pkgPath = path.resolve(__dirname, '../package.json');
const pkg = fse.readJSONSync(pkgPath);

const LOWEST_NODE_VERSION = '14.0.0';

function checkNodeVersion(){
  log.verbose('node version', process.version)
  if(!semver.gte(process.version, LOWEST_NODE_VERSION)){
    throw new Error(chalk.red(`liyue-cli 最低需${LOWEST_NODE_VERSION}以上的版本`))
  }
}

function preAction(){
  // 检查node版本
  checkNodeVersion()
}

export default function createCli() {
  log.info('version', pkg.version)
    // 脚手架入口文件
  // 拿到program的实例开始注册脚手架
  program
    .name(Object.keys(pkg.bin)[0])
    .usage('<command> [options]')
    .version(pkg.version)
    .option('-d, --debug', '是否开启调试模式', false)
    .hook('preAction', preAction)

  // 监听属性
  program.on('option:debug', function(){
    // 对应 program的options 在action的时候可以拿到具体的信息
    console.log(program.opts())
    if(program.opts().debug){
      log.verbose('debug', 'launch debug mode')
    }
  })
  
  // 处理不存在的命令
  program.on('command:*', function(obj){
    log.error('未知的命令：' +obj[0])
  })

  return program;
}