/* Owner-configured AdSense mounts. Loading an ad SDK is deliberately opt-in. */
(() => {
  let config = {
    enabled: false,
    preview: false,
    publisher: "",
    slots: {},
    consent: false,
    ...window.PG_ADS_CONFIG,
  };
  const placements = {
    home: "#screen-home",
    games: "#screen-selection",
    lobby: '.room[data-phase="lobby"]',
    game: '.room[data-phase="game"]',
  };

  function render() {
    for (const [key, selector] of Object.entries(placements)) {
      let slot = document.querySelector(`[data-ad-placement="${key}"]`);
      const parent = document.querySelector(selector);
      if (!parent) {
        slot?.remove();
        continue;
      }
      if (!slot) {
        slot = document.createElement("aside");
        slot.className = "pg-ad";
        slot.dataset.adPlacement = key;
        parent.append(slot);
      }
      // Reserve space only on monitors with room beyond the gameplay workspace.
      const visible = !parent.closest(".screen")?.hidden;
      const fits = visible && innerWidth >= 1600 && innerHeight >= 950;
      const ready = config.enabled && config.consent &&
        /^ca-pub-\d{16}$/.test(config.publisher) &&
        /^\d+$/.test(String(config.slots?.[key] || ""));
      slot.hidden = !(fits && (config.preview || ready)) || slot.dataset.unfilled === "true";
      if (slot.hidden) {
        if (slot.childNodes.length) slot.replaceChildren();
        continue;
      }
      if (slot.childNodes.length) continue;
      const label = document.createElement("small");
      label.textContent = "Advertisement";
      if (config.preview) {
        const preview = document.createElement("div");
        preview.textContent = "Placement preview";
        slot.append(label, preview);
        continue;
      }
      const ins = document.createElement("ins");
      ins.className = "adsbygoogle";
      ins.dataset.adClient = config.publisher;
      ins.dataset.adSlot = config.slots[key];
      ins.dataset.adFormat = "auto";
      ins.style.display = "block";
      slot.append(label, ins);
      new MutationObserver(() => {
        if (ins.dataset.adStatus === "unfilled") {
          slot.dataset.unfilled = "true";
          slot.hidden = true;
        }
      }).observe(ins, { attributes: true, attributeFilter: ["data-ad-status"] });
      window.dispatchEvent(new CustomEvent("playgrid:adslot-ready", {
        detail: { placement: key, element: ins },
      }));
    }
  }

  window.PGAds = {
    configure(next) {
      config = { ...config, ...next };
      document.querySelectorAll(".pg-ad").forEach(node => node.remove());
      render();
    },
    setConsent(value) {
      config.consent = value === true;
      window.dispatchEvent(new CustomEvent("playgrid:ad-consent", {
        detail: { consent: config.consent },
      }));
      render();
    },
    refresh: render,
    getConfig: () => ({ ...config, slots: { ...config.slots } }),
  };
  window.addEventListener("resize", render);
  render();
})();
