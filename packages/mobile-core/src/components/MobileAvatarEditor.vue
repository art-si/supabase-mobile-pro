<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import MobileAvatar from './MobileAvatar.vue'
import MobileAction from './MobileAction.vue'
import MobileIcon from './MobileIcon.vue'
// #ifdef H5
import MobileAvatarCropper from './MobileAvatarCropper.vue'
// #endif
import { chooseMediaFiles } from '../media-choose'
import { createUploadQueue } from '../upload-queue'
import { useOverlayFocus } from '../overlay-focus'
import type { UploadedMedia } from '../media-upload'
import type { UploadOptions } from '../upload-progress'
import type { UploadImageNormalizer } from '../image-prepare'
defineOptions({options:{styleIsolation:'apply-shared'}})
const props=withDefaults(defineProps<{name?:string;scope:string|number;disabled?:boolean;upload:(path:string,options:UploadOptions)=>Promise<UploadedMedia>;errorText:(error:unknown)=>string;recovery?:(error:unknown)=>'login'|'retry'|'remove';maxBytes?:number;normalizeUnsupportedImage?:UploadImageNormalizer}>(),{name:'',maxBytes:8*1024*1024})
const model=defineModel<UploadedMedia|null>({default:null})
const emit=defineEmits<{busy:[value:boolean];login:[]}>()
const selecting=ref(false),uploading=ref(false),visible=ref(false),raw=ref(''),local=ref(''),error=ref(''),progress=ref<number>(),pending=ref(''),needsLogin=ref(false),rawNotice=ref('')
const panel=ref(),cropper=ref<{setRotate:(angle:number)=>void}>()
let version=0, cropVersion=0, cropScope=props.scope, disposed=false,releaseRaw:(()=>void)|undefined,angle=0,candidate=''
const busy=computed(()=>selecting.value||uploading.value||visible.value)
watch(busy,value=>emit('busy',value),{immediate:true})
useOverlayFocus(visible,{panel:()=>panel.value,cancel:cancelCrop,initial:'.mobile-avatar-cropper__cancel, .wd-img-cropper__cancel'})
const queue=createUploadQueue<{key:string;path:string}>(async(item,signal)=>{
  const revision=version,scope=props.scope
  const current=()=>!disposed&&!signal.aborted&&revision===version&&scope===props.scope
  uploading.value=true;progress.value=undefined;error.value='';needsLogin.value=false
  let uploadPath=item.path,releaseCopy=()=>{}
  try{
    // Uni's H5 canvas exporter returns a local data URL. The common image
    // preparation accepts local blob URLs; do not widen it to remote sources.
    // #ifdef H5
    if(/^data:image\/(jpeg|png);base64,/.test(item.path)){
      const encoded=item.path.slice(item.path.indexOf(',')+1)
      if(encoded.length>Math.ceil(props.maxBytes/3)*4)throw Object.assign(new Error('IMAGE_INPUT_TOO_LARGE'),{code:'IMAGE_INPUT_TOO_LARGE'})
      const bytes=Uint8Array.from(atob(encoded),value=>value.charCodeAt(0))
      if(bytes.byteLength>props.maxBytes)throw Object.assign(new Error('IMAGE_INPUT_TOO_LARGE'),{code:'IMAGE_INPUT_TOO_LARGE'})
      uploadPath=URL.createObjectURL(new Blob([bytes],{type:item.path.startsWith('data:image/png')?'image/png':'image/jpeg'}))
      releaseCopy=()=>URL.revokeObjectURL(uploadPath)
    }
    // #endif
    if(!current())return
    const asset=await props.upload(uploadPath,{signal,onProgress:value=>{if(current())progress.value=value}})
    if(!current())return
    candidate=asset.id;local.value=item.path;model.value=asset;pending.value=''
  }catch(failure){if(current()){error.value=props.errorText(failure);needsLogin.value=props.recovery?.(failure)==='login'}}
  finally{releaseCopy();if(current())uploading.value=false}
},1)
watch(()=>props.scope,()=>{version++;queue.clear();selecting.value=uploading.value=visible.value=false;error.value=local.value=pending.value='';releaseRaw?.();releaseRaw=undefined})
watch(()=>model.value?.id,id=>{if(id!==candidate)local.value=''})
async function choose(){
  if(props.disabled||busy.value)return
  const scope=props.scope,revision=++version
  selecting.value=true;error.value=''
  try{
    const media=(await chooseMediaFiles(1,['image']))[0]
    if(!media)return
    if(disposed||scope!==props.scope||revision!==version){media.release?.();return}
    if(media.size>props.maxBytes||media.size<=0){media.release?.();error.value=`请选择 ${Math.floor(props.maxBytes/1024/1024)}MB 以内的图片`;return}
    releaseRaw?.();releaseRaw=media.release;raw.value=media.path;rawNotice.value=media.notice||'';angle=0;cropVersion=revision;cropScope=scope;visible.value=true
  }catch(failure){if(!disposed&&scope===props.scope&&revision===version)error.value=props.errorText(failure)}
  finally{if(scope===props.scope&&revision===version)selecting.value=false}
}
function cropped(result:{tempFilePath:string}){
  if(!result.tempFilePath||disposed||cropVersion!==version||cropScope!==props.scope)return
  releaseRaw?.();releaseRaw=undefined;pending.value=result.tempFilePath;visible.value=false
  queue.enqueue({key:'avatar-'+version,path:pending.value})
}
function retry(){if(needsLogin.value){emit('login');return}if(pending.value){queue.clear();queue.enqueue({key:'avatar-'+(++version),path:pending.value})}}
function reset(){if(busy.value||props.disabled)return;candidate='';local.value='';model.value=null;error.value=''}
function rotate(){angle=(angle+90)%360;cropper.value?.setRotate(angle)}
function cancelCrop(){version++;visible.value=false;releaseRaw?.();releaseRaw=undefined}
function cropError(){cancelCrop();error.value='这张图片暂时无法读取，请重新选择'}
onBeforeUnmount(()=>{disposed=true;queue.clear();releaseRaw?.()})
</script>
<template>
  <view class="mobile-avatar-editor">
    <MobileAction class="mobile-avatar-editor__row" aria-label="更换头像" :disabled="disabled||busy" :aria-busy="busy" @click="choose">
      <MobileAvatar :src="local||model?.url" :name="name" :size="72"><slot /></MobileAvatar>
      <view class="mobile-avatar-editor__copy"><text class="mobile-avatar-editor__title">头像</text><text class="mobile-avatar-editor__hint" role="status">{{uploading?(progress!=null&&progress<100?`正在上传 ${Math.floor(progress)}%`:'正在处理头像…'):selecting?'正在选择…':'点击更换头像'}}</text></view>
      <MobileIcon name="camera" :size="22" />
    </MobileAction>
    <view class="mobile-avatar-editor__actions"><MobileAction v-if="model" variant="link" :disabled="disabled||busy" @click="reset">恢复默认头像</MobileAction><MobileAction v-if="error&&pending" variant="link" @click="retry">{{needsLogin?'登录后继续':'重试上传'}}</MobileAction></view>
    <text v-if="error" class="mobile-avatar-editor__error" role="alert">{{error}}</text>
    <view v-if="visible" ref="panel" class="mobile-avatar-editor__dialog" role="dialog" aria-modal="true" aria-label="调整头像" tabindex="-1">
      <!-- #ifdef H5 -->
      <MobileAvatarCropper :src="raw" :max-bytes="maxBytes" :notice="rawNotice" :normalize-unsupported-image="normalizeUnsupportedImage" @confirm="cropped" @cancel="cancelCrop" />
      <!-- #endif -->
      <!-- #ifndef H5 -->
      <view class="mobile-avatar-editor__instructions"><text class="mobile-avatar-editor__dialog-title">调整头像</text><text>拖动或双指缩放，调整头像位置</text></view>
      <wd-img-cropper ref="cropper" v-model="visible" :img-src="raw" aspect-ratio="1:1" file-type="jpg" :quality=".88" :export-scale="2" disabled-rotate cancel-button-text="取消" confirm-button-text="使用头像" @confirm="cropped" @cancel="cancelCrop" @imgloaderror="cropError" />
      <MobileAction class="mobile-avatar-editor__rotate" aria-label="旋转头像" @click="rotate"><MobileIcon name="refresh" :size="24" /></MobileAction>
      <!-- #endif -->
    </view>
  </view>
</template>
<style scoped>
.mobile-avatar-editor{display:grid;gap:8px;min-width:0}
.mobile-avatar-editor__row.mobile-action{display:flex;align-items:center;gap:16px;width:100%;padding:8px 0;text-align:start;min-height:88px;border-radius:12px}
.mobile-avatar-editor__copy{flex:1;min-width:0;display:grid;gap:6px;line-height:1.5}
.mobile-avatar-editor__title{font-weight:650;font-size:1rem;color:var(--mobile-workspace-ink,var(--tms-text-strong,var(--smis-text-strong)))}
.mobile-avatar-editor__hint{font-size:.875rem;color:var(--mobile-workspace-muted,var(--tms-muted,var(--smis-muted)))}
.mobile-avatar-editor__actions{display:flex;align-items:center;flex-wrap:wrap;gap:12px}
.mobile-avatar-editor__actions:empty{display:none}
.mobile-avatar-editor__error{font-size:.875rem;line-height:1.5;color:var(--mobile-workspace-danger,var(--tms-red-strong,#b42318))}
.mobile-avatar-editor__dialog{position:fixed;inset:0;z-index:500;background:#000;--wot-button-primary-bg:var(--mobile-workspace-accent,var(--tms-primary,#126a5b));--wot-button-primary-bg-active:var(--mobile-workspace-accent,var(--tms-primary,#126a5b));--wot-img-cropper-footer-padding:16px max(16px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left))}
.mobile-avatar-editor__instructions{position:fixed;top:max(20px,env(safe-area-inset-top));left:16px;right:16px;display:grid;gap:8px;text-align:center;color:#ffffffc9;font-size:.875rem;line-height:1.5;pointer-events:none;z-index:10001}
.mobile-avatar-editor__dialog-title{font-size:1.125rem;font-weight:650;color:#fff}
.mobile-avatar-editor__rotate.mobile-action{position:fixed;left:50%;transform:translateX(-50%);bottom:max(16px,env(safe-area-inset-bottom));z-index:10001;width:48px;height:48px;color:#fff;background:#ffffff20;border-radius:50%}
</style>
