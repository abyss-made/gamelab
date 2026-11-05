// Avatar Studio 2.0 client: trusted bundled assets only. Every config is normalized against the
// bundled catalog (allowlisted enums, no URLs/markup), and SVG sources are fetched only from
// /assets/avatars/. Falls back to the classic portrait if anything fails.
(() => {
  const PALETTES = { lime: "#b7ff04", cyan: "#62d5ee", violet: "#b49aee", amber: "#f2b16b", rose: "#e7a2bc", mint: "#a4dba8" };
  const SLOTS = ["expression", "eyes", "hat", "glasses", "accessory", "detail"];
  const SVGNS = "http://www.w3.org/2000/svg";
  let catalogP = null;
  let catalog = null;
  const sources = new Map();
  let seq = 0;

  const loadCatalog = () =>
    catalogP || (catalogP = fetch("/assets/avatars/catalog.json").then((r) => { if (!r.ok) throw Error("catalog"); return r.json(); }).then((c) => (catalog = c)));
  const byId = (id) => catalog && catalog.characters.find((c) => c.id === id);

  // Returns a fresh, valid config or null. Needs the catalog to be loaded.
  function normalize(v) {
    if (!catalog || !v || typeof v !== "object" || Array.isArray(v) || v.v !== catalog.schemaVersion) return null;
    const c = typeof v.id === "string" && byId(v.id);
    if (!c) return null;
    const out = { v: v.v, id: c.id, palette: Object.hasOwn(PALETTES, v.palette) ? v.palette : c.defaultLook.palette };
    for (const s of SLOTS) out[s] = c.compatibility[s].includes(v[s]) ? v[s] : c.defaultLook[s];
    if (out.hat !== "none" && out.accessory === "headphones") out.accessory = "none";
    return out;
  }
  const defaultConfig = (id) => { const c = byId(id) || catalog.characters[0]; return { v: catalog.schemaVersion, id: c.id, ...c.defaultLook }; };

  async function compose(cfg, instance) {
    const c = byId(cfg.id);
    if (!sources.has(c.id)) sources.set(c.id, fetch(c.asset).then((r) => { if (!r.ok) throw Error("asset"); return r.text(); }));
    const doc = new DOMParser().parseFromString(await sources.get(c.id), "image/svg+xml");
    if (doc.querySelector("parsererror")) throw Error("svg");
    const svg = doc.documentElement;
    svg.style.setProperty("--accent", PALETTES[cfg.palette]);
    svg.dataset.expression = cfg.expression;
    svg.dataset.eyeStyle = cfg.eyes;
    svg.dataset.detail = cfg.detail;
    for (const slot of ["hat", "glasses", "accessory"]) {
      const item = cfg[slot];
      const target = svg.querySelector(`[data-layer="${slot}"]`);
      if (!target) continue;
      target.replaceChildren();
      if (item === "none") continue;
      const a = item === "scarf" ? c.anchors.scarf : c.anchors[slot];
      const use = doc.createElementNS(SVGNS, "use");
      use.setAttribute("href", `#${c.id}-${item === "round" ? "round-glasses" : item}`);
      for (const k of ["x", "y", "width", "height"]) use.setAttribute(k, String(a[k]));
      if (a.rotate) use.setAttribute("transform", `rotate(${a.rotate} ${a.x + a.width / 2} ${a.y + a.height / 2})`);
      target.append(use);
    }
    // Unique ids per instance so several avatars can share one page.
    const ids = new Map([...svg.querySelectorAll("[id]")].map((e) => [e.id, `${instance}-${e.id}`]));
    for (const e of [svg, ...svg.querySelectorAll("*")])
      for (const at of [...e.attributes]) {
        let val = at.value;
        for (const [old, nid] of ids) {
          if (at.name === "id" && val === old) val = nid;
          val = val.replaceAll(`url(#${old})`, `url(#${nid})`);
          if (val === `#${old}`) val = `#${nid}`;
          if (at.name === "aria-labelledby" && val === old) val = nid;
        }
        if (val !== at.value) e.setAttribute(at.name, val);
      }
    svg.setAttribute("aria-hidden", "true");
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    return svg;
  }

  // Replace the classic art of every unhydrated [data-v3] avatar with the composed SVG.
  async function hydrate(root = document) {
    const nodes = [...root.querySelectorAll("[data-v3]:not([data-v3-done])")];
    if (!nodes.length) return;
    try { await loadCatalog(); } catch (e) { return; } // classic art stays visible
    for (const el of nodes) {
      el.dataset.v3Done = "1";
      let cfg = null;
      try { cfg = normalize(JSON.parse(el.dataset.v3)); } catch (e) { /* bad json */ }
      if (!cfg) continue;
      try {
        const svg = await compose(cfg, `av${++seq}`);
        if (!el.isConnected) continue;
        el.querySelector(".avatar-art")?.remove();
        el.querySelector("svg")?.remove();
        el.append(svg);
        el.classList.add("avatar-v3");
      } catch (e) { /* classic art stays */ }
    }
  }

  function start() {
    let queued = false;
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; hydrate(); });
    }).observe(document.body, { childList: true, subtree: true });
    hydrate();
  }
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);

  window.PGAvatar = { PALETTES, SLOTS, loadCatalog, normalize, defaultConfig, hydrate, catalog: () => catalog };
})();
