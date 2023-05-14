import path from 'node:path';
import { homedir } from 'node:os';
import fs from 'node:fs';
import { pathExistsSync } from 'path-exists';
import fse from 'fs-extra';
import { makePassword, log } from '../index.js';
import { execa } from 'execa';

// 缓存目录
const TEMP_HOME = '.liyue-cli';
const TEMP_TOKEN = '.token';
const TEMP_PLATFORM = '.git_platform';
const TEMP_OWN = '.git_own';
const TEMP_LOGIN = '.git_login';

function createTokenPath(){
  return path.resolve(homedir(), TEMP_HOME, TEMP_TOKEN)
}

function createPlatFormPath(){
  return path.resolve(homedir(), TEMP_HOME, TEMP_PLATFORM);
}

function createOwnPath() {
  return path.resolve(homedir(), TEMP_HOME, TEMP_OWN);
}

function createLoginPath() {
  return path.resolve(homedir(), TEMP_HOME, TEMP_LOGIN);
}

function getGitOwn() {
  if (pathExistsSync(createOwnPath())) {
    return fs.readFileSync(createOwnPath()).toString();
  }
  return null;
}

function getGitLogin() {
  if (pathExistsSync(createLoginPath())) {
    return fs.readFileSync(createLoginPath()).toString();
  }
  return null;
}

// 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  github token

function getGitPlatform(){
  if(pathExistsSync(createPlatFormPath())){
    return fs.readFileSync(createPlatFormPath()).toString()
  }
  return null;
}

function getProjectPath(cwd, fullName) {
  const projectName = fullName.split('/')[1]; // vuejs/vue => vue
  return path.resolve(cwd, projectName);
}

function getPackageJson(cwd, fullName) {
  const projectPath = getProjectPath(cwd, fullName);
  const pkgPath = path.resolve(projectPath, 'package.json');
  if (pathExistsSync(pkgPath)) {
    return fse.readJsonSync(pkgPath);
  }
  return null;
}

function clearCache() {
  const platform = createPlatFormPath();
  const token = createTokenPath();
  const own = createOwnPath();
  const login = createLoginPath();
  fse.removeSync(platform);
  fse.removeSync(token);
  fse.removeSync(own);
  fse.removeSync(login);
}

class GitServer {
  constructor(){}

  async init(){
    // 判断token是否录入
    const tokenPath = createTokenPath();
    if(pathExistsSync(tokenPath)){
      this.token = fse.readFileSync(tokenPath).toString();
    } else {
      this.token = await this.getToken();
      fs.writeFileSync(tokenPath, this.token);
    }
    log.verbose('token', this.token);
  }

  getToken(){
    return makePassword({
      message: '请输入token信息',
    })
  }

  savePlatform(platform){
    this.platform = platform;
    fs.writeFileSync(createPlatFormPath(), platform)
  }

  getPlatform(){
    return this.platform;
  }

  getOwn() {
    return this.own;
  }

  getLogin() {
    return this.login;
  }

  saveOwn(own) {
    this.own = own;
    fs.writeFileSync(createOwnPath(), own);
  }

  saveLogin(login) {
    this.login = login;
    fs.writeFileSync(createLoginPath(), login);
  }

  cloneRepo(fullName, tag) {
    if (tag) {
      return execa('git', ['clone', this.getRepoUrl(fullName), '-b', tag]);
    } else {
      return execa('git', ['clone', this.getRepoUrl(fullName)]);
    }
  }

  installDependencies(cwd, fullName) {
    const projectPath = getProjectPath(cwd, fullName);
    if (pathExistsSync(projectPath)) {
      // 第三个参数 指定执行路径
      return execa('npm', ['install'], { cwd: projectPath });
    }
    return null;
  }

  async runRepo(cwd, fullName) {
    const projectPath = getProjectPath(cwd, fullName);
    const pkg = getPackageJson(cwd, fullName);
    if (pkg) {
      const { scripts, bin, name } = pkg;
      // 
      if (bin) {
        await execa('npm',
          ['install', '-g', name, '--registry=https://registry.npmmirror.com'],
          { cwd: projectPath, stdout: 'inherit' }
        );
      }
      if (scripts && scripts.dev) {
       // stdout: 'inherit' 会继承当前控制台的输出流
        return execa('npm', ['run', 'dev'], { cwd: projectPath, stdout: 'inherit' });
      } else if (scripts && scripts.start) {
        return execa('npm', ['start'], { cwd: projectPath, stdout: 'inherit' });
      } else {
        log.warn('未找到启动命令');
      }
    }
  }

  getUser() {
    throw new Error('getUser must be implemented!');
  }

  getOrg() {
    throw new Error('getOrg must be implemented!');
  }

  createRepo() {
    throw new Error('createRepo must be implemented!');
  }
}

export {
  GitServer,
  getGitPlatform,
  getGitOwn,
  getGitLogin,
  clearCache,
}