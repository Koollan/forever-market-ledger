// HTML formatting for the UI

export const esc=(s: unknown)=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c as "&"]));
export function money(c: number|null|undefined): string{
  if(c==null||!isFinite(c))return '<span class="money muted">—</span>';
  c=Math.round(c);const neg=c<0;c=Math.abs(c);
  const g=Math.floor(c/10000),s=Math.floor(c%10000/100),cc=c%100;
  let o="";if(g)o+=`${g.toLocaleString()}<span class="g">g</span> `;if(s||g)o+=`${s}<span class="s">s</span>`;if(!g)o+=` ${cc}<span class="c">c</span>`;
  return `<span class="money">${neg?"−":""}${o.trim()}</span>`;
}
