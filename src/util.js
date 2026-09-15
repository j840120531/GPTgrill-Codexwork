import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
export const sha256=(text)=>createHash('sha256').update(text).digest('hex');
export const shortHash=(text,length=12)=>sha256(text).slice(0,length);
export async function ensureDir(dir){await fs.mkdir(dir,{recursive:true});}
export async function pathExists(p){try{await fs.access(p);return true;}catch{return false;}}
export const nowIso=()=>new Date().toISOString();
export function assertRepoRelative(p,label){if(!p||path.isAbsolute(p)||p.includes('\0'))throw new Error(`${label} must be repo-relative`);const n=path.posix.normalize(p.replaceAll('\\','/'));if(n==='..'||n.startsWith('../'))throw new Error(`${label} escapes repository`);}
export function slug(input){return input.toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'goal';}
