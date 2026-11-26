import {base,demoPath} from './demo-runtime.mjs'
export const workspace='';export const workspacePath=demoPath;export function scopeWorkspaceLinks(){for(const link of document.querySelectorAll('a[href^="/"]')){link.href=demoPath(link.getAttribute('href'))}}export function rememberReturnWorkspace(){}export function returnWorkspace(){return base}export function forgetReturnWorkspace(){}
