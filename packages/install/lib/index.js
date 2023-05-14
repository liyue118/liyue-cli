'use strict'
import ora from 'ora';
import Command from '@liyue.com/command';
import { log, makeList, makeInput, printErrorLog, initGitServer } from '@liyue.com/utils';

const PREV_PAGE = '${prev_page}';
const NEXT_PAGE = '${next_page}';
const SEARCH_MODE_REPO = 'search_repo';
const SEARCH_MODE_CODE = 'search_code';

class InstallCommand extends Command {
  get command(){
    return 'install'
  }

  get description(){
    return 'install project'
  }

  get options(){

  }

  async action(params){
    await this.generateGitApi(params);
    await this.searchGitApi();
    await this.selectTags();
    log.verbose('ful_name', this.keyword);
    log.verbose('selectTag', this.selectTag);
    await this.downloadRepo();
    await this.installDependencies();
    this.keyword = '/element';
    await this.runRepo();
  }

  async runRepo() {
    await this.gitAPI.runRepo(process.cwd(), this.keyword);
  }

  async downloadRepo() {
    const spinner = ora(`正在下载: ${this.keyword}(${this.selectTag})`).start();
    try {
      await this.gitAPI.cloneRepo(this.keyword, this.selectTag);
      spinner.stop();
      log.success(`下载成功: ${this.keyword}(${this.selectTag})`);
    } catch (e) {
      spinner.stop();
      printErrorLog(e);
    }
  }

  async installDependencies() {
    const spinner = ora(`正在安装依赖: ${this.keyword}(${this.selectTag})`).start();
    try {
      const ret = await this.gitAPI.installDependencies(process.cwd(), this.keyword, this.selectTag);
      spinner.stop();
      if (!ret) {
        log.error(`依赖安装失败: ${this.keyword}(${this.selectTag})`);
      } else {
        log.success(`依赖安装成功: ${this.keyword}(${this.selectTag})`);
      }
    } catch (e) {
      spinner.stop();
      printErrorLog(e);
    }
  }

  async generateGitApi(){
    this.gitAPI = await initGitServer();
  }

  async searchGitApi(){
    this.page = 1;
    this.per_page = 10;
    this.platform = this.gitAPI.getPlatform();
    if(this.platform === 'github'){
      this.mode = await makeList({
        message:'请选择搜索的模式',
        choices: [
          {
            name: '仓库', 
            value: SEARCH_MODE_CODE
          },
          {
            name: '源码', 
            value: SEARCH_MODE_REPO
          }
        ]
      })
    } else {
      this.mode = SEARCH_MODE_REPO;
    }
    // 1. 收集搜索关键词和开发语言
    this.q = await makeInput({
      message: '请输入搜索关键词',
      validate(v){
        return v.length > 0 ? true : '请输入搜索关键词'
      }
    });
    this.language = await makeInput({
      message: '请输入开发语言',
      validate(v){
        return v.length > 0 ? true : '请输入开发语言'
      }
    })
    await this.doSearch()
  }

  async doSearch(){
    // 2. 生成搜索参数
   
    let searchResult;
    let count;
    let list;

    if(this.platform === 'github'){
      const params = {
        q: this.q + (this.language ? `+language:${this.language}` : ''),
        order: 'desc',
        sort: 'stars',
        per_page: this.per_page,
        page: this.page,
      }
      log.verbose(params, this.gitAPI.getPlatform(), this.mode)

      console.log(this.mode, params, 'this.mode=====')
      if(this.mode === SEARCH_MODE_REPO){
        searchResult = await this.gitAPI.searchRepositories(params);
        list = searchResult.items.map(item => ({
          name: `${item.full_name}(${item.description})`,
          value: item.full_name
        }))
      } else {
       
        searchResult = await this.gitAPI.searchCode(params);
        list = searchResult.items.map(item => ({
          name: `${item.full_name}(${item.repository.description})`,
          value: item.repository.full_name
        }))
      }
      
      count = searchResult.total_count; //整体数据量
      
    }

    // 判断当前页面，是否已经到达最大页数，否则就得进入下一页
    if(this.page * this.per_page < count){
      list.push({
        name: '下一页',
        value: NEXT_PAGE
      })
    }
    if(this.page > 1){
      list.unshift({
        name: '上一页',
        value: PREV_PAGE
      })
    }

    this.keyword = await makeList({
      message: `请选择要下载的项目 (共${count}条数据)`,
      choices: list,
    })

    if(this.keyword === NEXT_PAGE){
      this.nextPage()
    } else if(this.keyword === PREV_PAGE){
      this.prevPage()
    } else {
      // 下载项目
    }
    
    console.log(this.keyword)
  }

  async nextPage(){
    this.page ++;
    await this.doSearch();
  }

  async prevPage(){
    this.page --;
    await this.doSearch();
  }

  async selectTags(){
    let tagsList;
    this.tagPage = 1;
    this.tagPerPage = 30;
    if(this.gitAPI.getPlatform() === 'github'){
      tagsList = await this.doSelectTags();
    }
    
  }

  async doSelectTags(){
    const params = {
      page: this.tagPage,
      per_page: this.tagPerPage
    }

    const tagsList = await this.gitAPI.getTags(this.keyword, params);
    console.log(tagsList);
    const tagsListChoices = tagsList.map(item => ({
      name: item.name,
      value: item.name
    }));

    if(tagsList.length > 0){
      tagsListChoices.push({
        name: '下一页',
        value: NEXT_PAGE
      })
    }
    if(this.tagPage > 1){
      tagsListChoices.unshift({
        name: '上一页',
        value: PREV_PAGE
      })
    }

    const selectTag = await makeList({
      message: '请选择tag',
      choices: tagsListChoices
    })

    if(selectTag === NEXT_PAGE){
      await this.nextTags()
    } else if(selectTag === PREV_PAGE){
      await this.prevTags()
    } else {
      this.selectTag = selectTag;
    }
    console.log(selectTag)

    
  }

  async nextTags(){
    this.tagPage ++;
    await this.doSelectTags()
  }

  async prevTags(){
    this.tagPage --;
    await this.doSelectTags()
  }
}

function Install(instance){
  return new InstallCommand(instance)
}

export default Install;
