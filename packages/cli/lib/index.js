import createInitCommand  from '@liyue.com/init';
import createInstallCommand  from '@liyue.com/install';
import createCommitCommand  from '@liyue.com/commit';
import createEntityMkdir from '@liyue.com/createEntityMkdir';
import createCli from './createCli.js';
import './exception.js';

export default function(args){
  const program = createCli()
  // 注册自定义命令 默认写法
  // program
  // .command('init [name]')
  // .description('init project')
  // .option('-f, --force', '是否强制更新', false)
  // .action((name, opts) => {
  //   console.log('init.....', name, opts)
  // })

  // 封装后写法
  // console.log('cli', program)
  createInitCommand(program)
  createInstallCommand(program)
  createCommitCommand(program)
  createEntityMkdir(program)
  program.parse(process.argv)
}