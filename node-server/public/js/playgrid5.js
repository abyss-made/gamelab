/* Presentation adapter: reads rendered state, never emits intents or changes rules. */
(() => {
  const colors = { drawguess:'#557d34',fourrow:'#2a5d99',wordchain:'#547354',categories:'#387c78',colorstack:'#704b80',gofish:'#387d7b',tictactoe:'#5e4b82',dotsboxes:'#417b8b',wordscramble:'#98794e',trivia:'#6b519c',telephone:'#986e59',bluff:'#8d4a65',impostor:'#514b86',battleship:'#2d6478',checkers:'#8c604c',ludo:'#56816b',chess:'#77745e',pool:'#3c7356',golf:'#4c884b',tycoon:'#3e7664' };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let room = null, people = new Set(), scheduled = false;
  const animations = new Set();
  let turnKey = null, resultKey = null;
  function animate(node, frames, duration) {
    if (!node || reduced.matches || !node.animate) return;
    const a = node.animate(frames,{duration,easing:'cubic-bezier(.2,.8,.2,1)'});
    animations.add(a);
    a.finished.catch(()=>{}).finally(()=>animations.delete(a));
  }
  function sync() {
    scheduled = false;
    document.querySelectorAll('#games [data-game]').forEach(card => {
      const color = colors[card.dataset.game];
      if (color && card.style.getPropertyValue('--p5-tint') !== color) card.style.setProperty('--p5-tint',color);
    });
    const state = window.App?.S, stage = document.getElementById('stage');
    if (stage) {
      const game = state?.phase === 'game' ? state.gameId : '';
      if (stage.dataset.p5Game !== game) stage.dataset.p5Game = game;
    }
    if (!state?.code) {room=null;people.clear();turnKey=null;resultKey=null;return;}
    // Public, confirmed turn changes only. Effects never delay a playable control.
    const turn = state.phase === 'game'
      ? [state.code,state.gameId,state.game?.turnId,state.game?.turn,state.game?.phase].join(':') : null;
    if (turn && turn !== turnKey) {
      animate(stage?.querySelector('.b2-player.active'),
        [{boxShadow:'inset 3px 0 #ddffa4,0 0 0 4px #c5ff7866'},
         {boxShadow:'inset 3px 0 #ddffa4,0 0 0 0 #c5ff7800'}],420);
    }
    turnKey = turn;
    const result = state.lastResult && state.phase === 'lobby'
      ? state.code + ':' + JSON.stringify(state.lastResult) : null;
    if (result && result !== resultKey) animate(document.querySelector('.result-title'),
      [{opacity:0,transform:'translateY(12px) scale(.96)'},{opacity:1,transform:'none'}],380);
    resultKey = result;
    const next = new Set(state.players.map(p=>p.id));
    if (room === state.code) {
      const cards = document.querySelectorAll('.party-roster .roster-card');
      state.players.forEach((p,i)=>{
        if (!people.has(p.id)) animate(cards[i],[{opacity:0,transform:'translateY(16px) scale(.95)'},{opacity:1,transform:'none'}],340);
      });
    }
    room = state.code; people = next;
  }
  const observer = new MutationObserver(() => {if (!scheduled){scheduled=true;queueMicrotask(sync);}});
  observer.observe(document.getElementById('app') || document.body,{childList:true,subtree:true});
  reduced.addEventListener('change',()=>{if(reduced.matches) animations.forEach(a=>a.cancel());});
  sync();
})();
