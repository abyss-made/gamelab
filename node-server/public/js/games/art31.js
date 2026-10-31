// Playgrid 3.1 shared art: original SVG chess silhouettes, a checkers crown and pip dice.
// Presentation only. Every piece/die value shown comes from the server state.
window.GameUI = window.GameUI || {};
GameUI.art = (() => {
  const SYMBOLS = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
    <symbol id="pc-P" viewBox="0 0 45 45"><circle cx="22.5" cy="13" r="6"/><path d="M16 38c0-9 3-12 6.500-14.500C26 26 29 29 29 38z"/><rect x="12" y="37" width="21" height="4" rx="2"/></symbol>
    <symbol id="pc-R" viewBox="0 0 45 45"><path d="M12 9h4v3h3.500V9h6v3H29V9h4v8l-3.500 3.500v13L33 37v4H12v-4l3.500-3.500v-13L12 17z"/></symbol>
    <symbol id="pc-N" viewBox="0 0 45 45"><path d="M13 41c0-9 2-14 6-18-3 .5-5 2-7 4l-2.500-3C13 17 17 8 26 7.500l1.500-3.500 2.500 3c5 2 8 8 8 17V41z"/><circle cx="24" cy="14" r="1.400" class="eye"/></symbol>
    <symbol id="pc-B" viewBox="0 0 45 45"><circle cx="22.500" cy="8" r="3"/><path d="M22.500 11c7 5 9 10 9 14 0 3-2 5-4 6.500V36h-10v-4.500c-2-1.500-4-3.500-4-6.500 0-4 2-9 9-14z"/><path d="M20 17l5.500 6.500" class="slit"/><rect x="12" y="36" width="21" height="5" rx="2.500"/></symbol>
    <symbol id="pc-Q" viewBox="0 0 45 45"><circle cx="8" cy="12" r="2.800"/><circle cx="15.500" cy="8" r="2.800"/><circle cx="22.500" cy="6.500" r="2.800"/><circle cx="29.500" cy="8" r="2.800"/><circle cx="37" cy="12" r="2.800"/><path d="M8 15l5 17h19l5-17-7.500 9-4.500-12-4.500 12z"/><rect x="11" y="33" width="23" height="3.500" rx="1.500"/><rect x="9.500" y="37" width="26" height="4" rx="2"/></symbol>
    <symbol id="pc-K" viewBox="0 0 45 45"><path d="M21 3h3v4h4v3h-4v4h-3v-4h-4V7h4z"/><path d="M22.500 15c8 0 14 4 14 10 0 4-3 6-6 7l1.500 5H13l1.500-5c-3-1-6-3-6-7 0-6 6-10 14-10z"/><rect x="11" y="36" width="23" height="5" rx="2.500"/></symbol>
    <symbol id="ck-crown" viewBox="0 0 24 24"><path d="M3 18l-1-11 6 5 4-8 4 8 6-5-1 11z"/></symbol>
  </svg>`;
  function install() {
    if (document.getElementById("pg31-symbols")) return;
    const d = document.createElement("div");
    d.id = "pg31-symbols";
    d.innerHTML = SYMBOLS;
    document.body.appendChild(d);
  }
  if (document.body) install();
  else document.addEventListener("DOMContentLoaded", install);

  const chessPiece = (type) => `<svg class="ch-svg" viewBox="0 0 45 45" aria-hidden="true" focusable="false"><use href="#pc-${type}"/></svg>`;
  const crown = () => '<svg class="ck-crown" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#ck-crown"/></svg>';
  // Pip layouts on a 3x3 grid (cells 1-9). Value 0/undefined shows a neutral "roll" die.
  const PIP_CELLS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
  const dieFace = (n) => (PIP_CELLS[n] || []).map((c) => `<i style="grid-area:${Math.ceil(c / 3)}/${((c - 1) % 3) + 1}"></i>`).join("");
  return { chessPiece, crown, dieFace };
})();
