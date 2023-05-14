
// 如何让jest支持esm模块 默认是commonjs
// 直接import会报错 SyntaxError: Cannot use import statement outside a module
// 仅靠package.json的type = module不行
// 需要通过babel
import path from 'node:path';
import { execa } from 'execa';


const CLI = path.join(__dirname, '../bin/cli.js');
const bin = () => (...args) => execa(CLI, args)

// 测试运行错误的命令
test('run error command', async () => {
  const { stderr } = await bin()('iii')
  expect(stderr).toContain('未知的命令')
})

// 测试help命令不报错
test('should not throw error when use --help', async() => {
  let error = null;
  try {
    await bin()('--help')
  } catch (e) {
    error = e;
  }

  expect(error).toBe(null);
})

// 测试version正确显示
test('show correct version', async () => {
  const { stdout } = await bin()('-V');
  console.log(stdout)
  expect(stdout).toContain(require('../package.json').version)
})

// 测试是否正确开始debug模式
test('open debug mode', async () => {
  let error = null;
  try {
    await bin()('--debug')
  } catch (e) {
    error = e;
    console.log(e.message)
  }
  expect(error.message).toContain('launch debug mode')
})
