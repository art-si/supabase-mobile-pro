// Native API/page lifecycle contract only; no actual camera or hosted upload.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'

function nativeSource(source) {
 const stack=[true]
 return source.split('\n').filter(line=>{const d=line.match(/^\s*\/\/ #(ifdef|ifndef|endif)(?:\s+(\S+))?/);if(!d)return stack.at(-1);if(d[1]==='endif')stack.pop();else stack.push(stack.at(-1)&&(d[1]==='ifdef'?d[2]==='MP-WEIXIN':d[2]!=='MP-WEIXIN'));return false}).join('\n')
}
function harness() {
 const hideListeners=new Set(),calls=[]
 let page={route:'pages/editor/index'}
 const uni={onAppHide:fn=>hideListeners.add(fn),offAppHide:fn=>hideListeners.delete(fn),chooseMedia:options=>calls.push(options)}
 function load(name,extra={}) {
  const source=nativeSource(readFileSync(new URL(`../packages/mobile-core/src/${name}.ts`,import.meta.url),'utf8'))
  const names=[...source.matchAll(/export (?:async )?function (\w+)/g)].map(match=>match[1]),exports={}
  const code=stripTypeScriptTypes(source.replace(/^import .*$/gm,'').replace(/export /g,''))
  runInNewContext(`${code};Object.assign(exports,{${names.join(',')}})`,{exports,uni,getCurrentPages:()=>[page],...extra})
  return exports
 }
 const session=load('media-picker-session'),picker=load('media-choose',session)
 return{session,picker,calls,hideListeners,setPage:next=>{page=next},hide:()=>hideListeners.forEach(fn=>fn())}
}
test('owned native chooser preserves page hide and consumes its return once for both callback/show orders',async()=>{
 for(const callbackFirst of [true,false]){
  const h=harness(),pending=h.picker.chooseMediaFiles(9,['image','video'])
  assert.equal(h.session.preserveMediaPickerPage(),true);h.hide()
  if(!callbackFirst)assert.equal(h.session.resumeMediaPickerPage(),true)
  h.calls[0].success({tempFiles:[{tempFilePath:'wxfile://real.jpg',fileType:'image',size:123}]})
  assert.equal((await pending)[0].path,'wxfile://real.jpg')
  if(callbackFirst)assert.equal(h.session.resumeMediaPickerPage(),true)
  assert.equal(h.session.resumeMediaPickerPage(),false);assert.equal(h.session.preserveMediaPickerPage(),false);assert.equal(h.hideListeners.size,0)
 }
})
test('replacement page may choose while an abandoned result is pending; old files are released',async()=>{
 const h=harness();let finish,released=0
 const old=h.session.withMediaPickerPage(()=>new Promise(resolve=>{finish=resolve}))
 h.setPage({route:'pages/editor/index'});assert.equal(h.session.preserveMediaPickerPage(),false)
 const current=h.picker.chooseMediaFiles(1,['image'],'album')
 finish([{release(){released++}}]);assert.equal((await old).length,0);assert.equal(released,1)
 assert.equal(h.session.preserveMediaPickerPage(),true)
 h.calls[0].success({tempFiles:[]});await current;assert.equal(h.hideListeners.size,0)
})
test('duplicate selection on the same page fails explicitly without corrupting its first handoff',async()=>{
 const h=harness(),one=h.picker.chooseMediaFiles(1,['image'],'camera')
 await assert.rejects(h.picker.chooseMediaFiles(1,['image'],'album'),error=>error.code==='MEDIA_SELECTION_IN_PROGRESS')
 assert.equal(h.calls.length,1);assert.equal(h.session.preserveMediaPickerPage(),true)
 h.calls[0].fail({errMsg:'chooseMedia:fail cancel'});assert.equal((await one).length,0);assert.equal(h.hideListeners.size,0)
})
test('camera remains a single image; mixed album keeps genuine metadata; permission and privacy failures stay distinguishable',async()=>{
 const h=harness(),photo=h.picker.chooseMediaFiles(9,['image','video'],'camera')
 assert.equal(h.calls[0].count,1);assert.deepEqual(Array.from(h.calls[0].sourceType),['camera']);assert.deepEqual(Array.from(h.calls[0].mediaType),['image'])
 h.calls[0].success({tempFiles:[{tempFilePath:'wxfile://camera.jpg',fileType:'image',size:456}]});assert.equal((await photo)[0].size,456)
 const video=h.picker.chooseMediaFiles(4,['image','video'],'album')
 h.calls[1].success({tempFiles:[{tempFilePath:'wxfile://clip.mp4',fileType:'video',size:789,duration:3,thumbTempFilePath:'wxfile://thumb.jpg'}]})
 const selected=(await video)[0];assert.equal(selected.poster,'wxfile://thumb.jpg');assert.equal(selected.duration,3);assert.equal(selected.kind,'video')
 for(const [message,code] of [['chooseMedia:fail authorize denied','MEDIA_PERMISSION_DENIED'],['chooseMedia:fail api scope is not declared in the privacy agreement','MEDIA_PRIVACY_UNDECLARED'],['chooseMedia:fail privacy authorization incomplete','MEDIA_PRIVACY_REQUIRED']]){
  const failure=h.picker.chooseMediaFiles(1,['image']);h.calls.at(-1).fail({errMsg:message,errCode:112})
  await assert.rejects(failure,error=>error.code===code&&error.nativeMessage===message&&error.nativeCode===112)
  assert.equal(h.hideListeners.size,0)
 }
})
