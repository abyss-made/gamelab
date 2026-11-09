// Word Scramble screen.
window.GameUI = window.GameUI || {};
GameUI.wordscramble = (() => {
  const C = GameUI.common;
  let root = null;
  let app = null;
  let clock = null;
  let S = null;
  let lastRound = -1;
  let feedback=null,order=[],tileKey="";

  function mount(stage, a) {
    app = a;
    root = document.createElement("div");
    root.className = "b2 ws pws";
    root.innerHTML = `<div class="b2-players card" id="ws-players"></div>
      <div class="card ws-main">
        <div class="hl-round" id="ws-round"></div>
        <div class="ws-tiles" id="ws-tiles" role="group" aria-label="Letter tiles: tap to build an answer"></div><div class="ws-arrange"><button type="button" class="btn btn-small btn-ghost" id="ws-shuffle">Shuffle tiles</button><button type="button" class="btn btn-small btn-ghost" id="ws-undo">Undo</button><button type="button" class="btn btn-small btn-ghost" id="ws-clear">Clear</button></div>
        <form class="ws-form" id="ws-form" autocomplete="off">
          <label class="sr-only" for="ws-input">Your answer</label>
          <input id="ws-input" type="text" inputmode="text" maxlength="24" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="send" placeholder="Tap tiles or type the word">
          <button class="btn" type="submit">Guess</button>
        </form>
        <div class="hl-status" id="ws-status" aria-live="polite"></div>
      </div>`;
    stage.appendChild(root);
    feedback=C.wordFeedback(root,app,'#ws-input','wordscramble');
    root.querySelector('#ws-input').addEventListener('input',paintTiles);
    root.addEventListener('click',e=>C.keepFocus(root,()=>{
      if(!canType())return;const input=root.querySelector('#ws-input'),tile=e.target.closest('[data-tile-index]');
      if(tile&&!tile.disabled)input.value+=S.game.letters[Number(tile.dataset.tileIndex)].toLowerCase();
      else if(e.target.closest('#ws-undo'))input.value=input.value.slice(0,-1);
      else if(e.target.closest('#ws-clear'))input.value='';
      else if(e.target.closest('#ws-shuffle')){for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}}
      else return;
      feedback.clear();paintTiles();
    }));
    clock = C.makeClock(() => root);
    root.querySelector("#ws-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const input = root.querySelector("#ws-input");
      const word = input.value.trim();
      if (!word || !S || S.game.phase !== "play" || S.game.solvedByMe) return;
      app.socket.emit("action", { type: "guess", word });
      // Keep the answer until the server accepts it or a new round begins.
    });
  }

  const canType=()=>S&&S.game.myIndex>=0&&!S.game.players[S.game.myIndex].out&&S.game.phase==='play'&&!S.game.solvedByMe;
  function paintTiles(){
    if(!S)return;const g=S.game,input=root.querySelector('#ws-input'),revealed=g.phase==='reveal'&&g.reveal,letters=revealed?g.reveal.word.toUpperCase().split(''):g.letters,used={};
    for(const ch of input.value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toUpperCase())used[ch]=(used[ch]||0)+1;
    const seq=revealed?letters.map((_,i)=>i):order;
    const html=seq.map(i=>{const ch=letters[i],taken=!revealed&&used[ch]>0;if(taken)used[ch]--;return `<button type="button" class="ws-tile ${revealed?'ok':''} ${taken?'used':''}" data-tile-index="${i}" aria-label="${app.esc(ch)}, tile ${i+1}${taken?', used':''}" ${!canType()||taken?'disabled':''}>${app.esc(ch)}</button>`;}).join('');
    if(html!==tileKey){root.querySelector('#ws-tiles').innerHTML=html;tileKey=html;}
    root.querySelector('#ws-undo').disabled=!canType()||!input.value;root.querySelector('#ws-clear').disabled=!canType()||!input.value;root.querySelector('#ws-shuffle').disabled=!canType();
  }

  function update(state) {
    S = state;
    const g = S.game;
    clock.set(g.timeLeft);
    root.querySelector("#ws-players").innerHTML = g.players
      .map((p) => C.playerChip(app, p, { extra: p.solved && g.phase === "play" ? '<span title="Solved">✔</span>' : "", sub: `${p.points} pts` }))
      .join("");
    root.querySelector("#ws-round").innerHTML = `Word ${g.round} of ${g.rounds} · ${g.length} letters <span class="fr-timer" data-timer></span>`;
    const revealed = g.phase === "reveal" && g.reveal;
    if(g.round!==lastRound){order=g.letters.map((_,i)=>i);root.querySelector('#ws-input').value='';feedback.clear();}
    paintTiles();
    const me = g.myIndex >= 0 ? g.players[g.myIndex] : null;
    const input = root.querySelector("#ws-input");
    const canType = !!me && !me.out && g.phase === "play" && !g.solvedByMe;
    input.disabled = !canType;
    root.querySelector("#ws-form button").disabled = !canType;
    let msg;
    if (!me) msg = "You're watching.";
    else if (revealed) {
      const first = g.reveal.solvers[0] && g.players.find((p) => p.id === g.reveal.solvers[0]);
      msg = g.solvedByMe ? `You got it! +${g.myGain}` : "Time's up, you missed this one.";
      if (first) msg += ` First: ${first.name}.`;
    } else msg = g.solvedByMe ? `Solved! +${g.myGain}. Waiting for the others…` : "Tap the letters or type an answer. Use every tile once.";
    root.querySelector("#ws-status").textContent = msg;
    if(g.solvedByMe)feedback.clear();
    if (g.round !== lastRound) {
      if (lastRound >= 0 && canType && matchMedia("(pointer:fine)").matches) input.focus({ preventScroll: true });
      lastRound = g.round;
    }
    clock.set(g.timeLeft);
  }

  function unmount() {
    if (clock) clock.stop();
    feedback?.stop();
    if (root) root.remove();
    root = null;
    lastRound = -1;
    order=[];tileKey="";S=null;
  }

  function renderResult(r, state, a) {
    return `<h2 class="result-title">${C.resultTitle(r, state, a)}</h2>${C.podium(r.standings, a, (p) => p.points, "pts")}<p class="muted center">${r.rounds} words played.</p>`;
  }
  return { mount, update, unmount, renderResult, resultSound: C.resultSound, scoreLabel: "pts" };
})();
