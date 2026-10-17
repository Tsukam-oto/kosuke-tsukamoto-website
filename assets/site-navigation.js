document.addEventListener('DOMContentLoaded',()=>{const menu=document.querySelector('.site-menu');if(!menu)return;menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>menu.open=false));document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.open){menu.open=false;menu.querySelector('summary').focus();}});document.addEventListener('click',e=>{if(menu.open&&!menu.contains(e.target))menu.open=false;});});
/* VOICE_AMBIENT_V1: quiet access from all site pages and poems */
document.addEventListener('DOMContentLoaded', () => {
  const menu = document.querySelector('.site-header .site-menu');
  const header = menu?.closest('.site-header');
  // Keep the existing MENU item as the non-JavaScript fallback.
  if (header && !document.querySelector('.site-voice-quicklink') &&
      window.location.pathname.replace(/\/+$/, '/') !== '/voice-box/') {
    const link = document.createElement('a');
    link.className = 'site-voice-quicklink';
    link.href = '/voice-box/';
    link.setAttribute('aria-label', '言葉を届ける（VOICE BOX）');
    const full = document.createElement('span');
    full.className = 'site-voice-full';
    full.textContent = '言葉を届ける ↗';
    const small = document.createElement('span');
    small.className = 'site-voice-compact';
    small.textContent = '届ける ↗';
    link.append(full, small);
    menu.before(link);
  }

  const poems = {
    'all-around-you':'All around you',
    'haru-ni-afurete':'春にあふれて',
    'muda-2026-03-18':'無題（2026年3月18日）',
    'natsu-wo-suikonde':'夏を吸い込んで',
    'korekara':'これから',
    'tadanaka':'ただなか',
    'harewataru-sora':'晴れ渡る空',
    'anata-to':'あなたと',
    'asa-ni-nattara':'朝になったら',
    'deai':'出会い',
    'negai':'願い'
  };
  // Every link is appended after the existing content of an open poem entry.
  // No poem line, sharing control, or source attribution is modified.
  document.querySelectorAll('.lyrics-list details.lyrics-item[id]').forEach(item => {
    const id = item.id;
    if (!Object.prototype.hasOwnProperty.call(poems, id)) return;
    if (item.querySelector('.voice-poem-feedback')) return;
    const wrap = document.createElement('p');
    wrap.className = 'voice-poem-feedback';
    const link = document.createElement('a');
    link.href = '/voice-box/?poem=' + encodeURIComponent(id) + '#voice-form';
    link.textContent = 'この言葉の感想を届ける →';
    link.setAttribute('aria-label', '《' + poems[id] + '》の感想をVOICE BOXへ届ける');
    wrap.append(link);
    item.append(wrap);
  });
});
