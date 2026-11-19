// Small pure helpers shared by the engine and the UI

/** Storage key for a material's entered prices. */
export const keyOf=(n: string)=>"item~"+String(n).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,120);
export function plainMoney(c: number|null|undefined): string{if(c==null)return"?";c=Math.round(c);const g=Math.floor(c/10000),s=Math.floor(c%10000/100),cc=c%100;return g?`${g}g ${s}s`:s?`${s}s ${cc}c`:`${cc}c`}
export const median=(a: (number|null|undefined)[]): number|null=>{const b=a.filter((x): x is number=>x!=null&&isFinite(x)).sort((x,y)=>x-y);if(!b.length)return null;const m=b.length>>1;return b.length%2?b[m]:(b[m-1]+b[m])/2};
export const andList=(a: string[])=>a.length<2?a.join(""):a.slice(0,-1).join(", ")+" and "+a[a.length-1];
export const pct=(x: number)=>(x>=0?"+":"−")+Math.abs(Math.round(x*100))+"%";
/** A short local time like "Tue 7 PM", or "now" within 90 minutes of `now`. */
export const whenTxt=(t: number,now: number)=>{const d=new Date(t);const diff=(t-now)/36e5;if(diff<1.5)return"now";
  return d.toLocaleString(undefined,{weekday:"short",hour:"numeric"})};
