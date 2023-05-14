'use strict'
import fs from 'node:fs';
import Command from '@liyue.com/command';
import { log, makeInput, makeList } from "@liyue.com/utils";
import path from 'node:path';
import { pathExistsSync } from 'path-exists';
import fse from 'fs-extra';
import ejs from 'ejs';
import prettier from 'prettier/standalone.js';
import parserBabel from 'prettier/parser-babel.js';

const CREATE_MODE_FORM_AND_LIST = 'create-form-and-list';
const CREATE_MODE_FORM = 'create-form';
const CREATE_MODE_LIST = 'create-list';
const CREATE_LIST_DOCUMENT = 'create-document-list';
const CREATE_LIST_BILL = 'create-bill-list';

function getCacheDir(targetPath, name){
  // 如果name 不存在，会创建一个
  return path.resolve(targetPath, name);
}

function ejsRender(data, type, file, listMode){
  // readFileSync()
  let template;
  if(type === 'form'){
    template = "import {EasyBizFormPresenter} from '@main/components/easy-bizform'; import {<%= data.genName %>} from '@q7/athena-gen'; export class <%= data.name %>FormPresenter extends <%= data.mode %> {constructor(options) {super(<%= data.genName %>, options)}}"
  }
  if(type === 'formItem'){
    template = "import {EasyBizFormItemsPresenter} from '@main/components/easy-bizform'; import {<%= data.genName %>} from '@q7/athena-gen'; export class <%= data.itemName %>FormItemPresenter extends <%= data.itemMode %> {getLogicPath(){return '<%= data.logicPath %>'}}"
  }
  if(type === 'list' && listMode === CREATE_LIST_DOCUMENT){
    template = "import {DocumentListPagePresenter} from '@root/solutions/athena-solutions/document-list'; import {<%= data.genName %>} from '@q7/athena-gen'; export class <%= data.name %>ListPresenter extends <%= data.mode %> {constructor(options) {super({...options})}}"
  }
  if(type === 'list' && listMode === CREATE_LIST_BILL){
    template = "import {QueryListPagePresenter} from '@main/screens/list'; import {<%= data.genName %>} from '@q7/athena-gen'; export class <%= data.name %>ListPresenter extends <%= data.mode %> {constructor(options) {super({...options})}}"
  }

  fse.writeFileSync(file, template);
  ejs.renderFile(file, data, (err, result)  => {
    if(!err){
      const formatText = prettier.format(result, {
        parser: "babel",
        plugins: [parserBabel]
      });
      fse.writeFileSync(file, formatText);
    } else {
      log.error(err)
    }
  })
}

/**
 * 
 * @param {*} targetPath 创建文件的根路径
 * @param {*} name 实体名称
 * @param {*} opts 是否强制覆盖文件夹
 * @param {*} mode 表单和或列表
 * @param {*} formItem 表单的子表
 * @param {*} listMode 列表是单据或档案
 */
function makeCacheDir(targetPath, name, genName, opts, mode, formItem, listMode){
  const cacheDir = getCacheDir(targetPath, name);
  const currentEntity = name.charAt(0).toUpperCase() + name.slice(1);
  log.verbose(targetPath, name, currentEntity, opts, mode, formItem, listMode, 'targetPath, name, currentEntity, opts, mode, formItem, listMode')
  if(!pathExistsSync(cacheDir)){
    // 这个目录下任何一个路径不存在，都会创建这个目录
    // 1. 创建实体文件夹
    fse.mkdirpSync(cacheDir)
    // 根绝选择的类型创建表单和或列表文件夹
    // 2.创建form文件夹
    if(mode === CREATE_MODE_FORM || mode === CREATE_MODE_FORM_AND_LIST){
      const cacheEntityFormDir = getCacheDir(`${targetPath}/${name}`, 'form');
      if(!pathExistsSync(cacheEntityFormDir)){
        fse.mkdirpSync(cacheEntityFormDir)
      }
      const formDir = `${targetPath}/${name}/form`
      const cacheEntityFormDirPresenter = getCacheDir(formDir, `${currentEntity}FormPresenter.tsx`);
      if(!pathExistsSync(cacheEntityFormDirPresenter)){
        fse.createFileSync(cacheEntityFormDirPresenter)
      }
      const ejsFormData = {
        data: {
          name,
          genName,
          mode: 'EasyBizFormPresenter'
        }
      }
      ejsRender(ejsFormData, 'form', cacheEntityFormDirPresenter)
      // 2.1 看是否同时需要创建子表文件
      if(!!formItem){
        const needCreateFormItem = formItem.split(',');
        needCreateFormItem.forEach(item => {
          const cacheEntityFormItemDirPresenter = getCacheDir(formDir, `${currentEntity}FormItemPresenter.tsx`);
          if(!pathExistsSync(cacheEntityFormItemDirPresenter)){
            fse.createFileSync(cacheEntityFormItemDirPresenter)
          }
          const ejsFormItemData = {
            data: {
              itemName: name,
              genName,
              logicPath:item,
              itemMode: 'EasyBizFormItemsPresenter'
            }
          }
          ejsRender(ejsFormItemData, 'formItem', cacheEntityFormItemDirPresenter)
        });
      }
    }
    // 3.创建list文件夹
    if((mode === CREATE_MODE_LIST || mode === CREATE_MODE_FORM_AND_LIST) && listMode){
      const cacheEntityListDir = getCacheDir(`${targetPath}/${name}`, 'list');
      if(!pathExistsSync(cacheEntityListDir)){
        fse.mkdirpSync(cacheEntityListDir)
      }
      const listDir = `${targetPath}/${name}/list`
      const cacheEntityListDirPresenter = getCacheDir(listDir, `${currentEntity}ListPresenter.tsx`);
      if(!pathExistsSync(cacheEntityListDirPresenter)){
        fse.createFileSync(cacheEntityListDirPresenter)
      }
      // 3.1 根据子表mode写入不同模板
      const ejsListData = {
        data: {
          name,
          genName,
          mode: listMode === CREATE_LIST_BILL ? 'QueryListPagePresenter' : 'DocumentListPagePresenter'
        }
      }
      ejsRender(ejsListData, 'list', cacheEntityListDirPresenter, listMode)
    }

  }
}

class CreateEntityMkdirCommand extends Command {
  get command(){
    // 注册命令
    return 'createEntityMkdir [name]'
  }

  get description(){
    return 'createEntityMkdir mkdir'
  }
  
  get options(){
    return [
      // 第三个参数是默认值
      ['-f, --force', '是否强制覆盖', false],
    ]
  }

  async action([name, opts]){
    // 1. 判断实体是否存在 = name是否合法
    // 实体名称转化Gen，读项目的packages/athena-gen/lib/entity-name.d.ts
    const frontTheoryPath = process.cwd().split('/front-theory');
    const genEntityNames = fs.readFileSync(`${frontTheoryPath[0]}/front-theory/packages/athena-gen/lib/entity-names.d.ts`).toString();
    const currentEntity = name.charAt(0).toUpperCase() + name.slice(1);
    const regex = RegExp(`EN_${currentEntity} = "${currentEntity}"`, 'g');
    const matchGenEntity = regex.exec(genEntityNames)
    if(!(matchGenEntity.length > 0)){
      log.error(`实体不存在或gen未定义，请检查`);
      return;
    }
    const genEntityName = matchGenEntity[0].split(' ');
    log.verbose('init', name, opts)
    const cacheDir = getCacheDir(process.cwd(), name);
    if(opts.force){
      fse.removeSync(cacheDir);
    }
    if(pathExistsSync(cacheDir)){
      log.error(`当前目录下已存在${cacheDir}文件夹,如果要覆盖请使用 --force 或 -f`);
      return;
    }
    // 2. 根据实体分别创建列表和表单
    this.createMode = await makeList({
      message:'请选择创建的模式',
      choices: [
        {
          name: '表单和列表', 
          value: CREATE_MODE_FORM_AND_LIST
        },
        {
          name: '表单', 
          value: CREATE_MODE_FORM
        },
        {
          name: '列表', 
          value: CREATE_MODE_LIST
        }
      ]
    })
    // 3. 如果是表单形式，需要再输入具体的子表名称，并创建
    this.createFormItem = undefined;
    if(this.createMode === CREATE_MODE_FORM || this.createMode === CREATE_MODE_FORM_AND_LIST){
      this.createFormItem = await makeInput({
        message:'请输入表单的子表，如果没有可以不输入,如果有多个以英文,间隔',
      })
    }
    // 4. 如果是列表形式，需要指定是档案列表还是单据列表
    if(this.createMode === CREATE_MODE_LIST || this.createMode === CREATE_MODE_FORM_AND_LIST){
      this.createListMode = await makeList({
        message:'请选择要创建的列表模式',
        choices: [
          {
            name: '档案', 
            value: CREATE_LIST_DOCUMENT
          },
          {
            name: '单据', 
            value: CREATE_LIST_BILL
          }
        ]
      })
    }
    // 5. 创建表单列表目录
    makeCacheDir(process.cwd(), name, genEntityName[0], opts, this.createMode, this.createFormItem, this.createListMode);
  }
}

function createEntityMkdir(instance){
  return new CreateEntityMkdirCommand(instance)
}

export default createEntityMkdir;