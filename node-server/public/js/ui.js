// Original stroke icons; all artwork is local, so the UI works without third-party CDNs.
window.Playgrid = (() => {
  const paths = {
    plus: "M12 5v14M5 12h14",
    arrow: "M5 12h14m-5-5 5 5-5 5",
    back: "M19 12H5m5-5-5 5 5 5",
    link: "m10 14 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 10a4 4 0 0 0 6 0l4-4a4 4 0 0 0-6-6l-1 1",
    settings:
      "m10 3 4 0 1 3 3 1 3-1 2 4-2 2v3l2 2-2 4-3-1-3 1-1 3h-4l-1-3-3-1-3 1-2-4 2-2v-3L1 10l2-4 3 1 3-1 1-3Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
    sound: "M11 4 5 9H2v6h3l6 5V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14",
    muted: "M11 4 5 9H2v6h3l6 5V4Zm4 5 6 6m0-6-6 6",
    people:
      "M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3M13 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm4-3a4 4 0 0 1 0 8m2 3a4 4 0 0 1 3 4v3",
    shield: "M12 2 3 6v6c0 6 9 10 9 10s9-4 9-10V6L12 2Zm-4 9 3 3 5-6",
    monitor: "M3 3h18v14H3V3Zm5 18h8m-4-4v4",
    controller:
      "M7 6h10c4 0 6 13 3 14-2 1-4-4-5-4H9c-1 0-3 5-5 4C1 19 3 6 7 6Zm-1 5h5m-2-2v4m7-3h.1m2 3h.1",
    copy: "M8 8h13v13H8V8ZM4 16H2V2h14v2",
    clock:
      "M12 8v5l3 2M9 2h6m-3 0v3m6 1 2-2M21 13a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
    brush: "m14 3 6-1-1 6-10 10-5-5L14 3ZM5 15c-5 0-1 5-4 7 6 1 9-4 7-6",
    eraser: "m14 3 7 7-10 11H5l-4-4L14 3Zm-7 8 7 7m-4 3h12",
    fill: "m4 3 13 13M10 4 2 12c-1 1 0 2 1 3l5 5c1 1 2 1 3 0l8-8L10 4Zm-6 9h14m2 3s-5 6-1 6 1-6 1-6",
    undo: "M9 4 3 10l6 5M3 10h10a6 6 0 1 1 0 12",
    trash: "M3 6h18M8 6V3h8v3M5 6l1 16h12l1-16M10 10v8m4-8v8",
    expand: "M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6",
    close: "m5 5 14 14M19 5 5 19",
    crown: "m3 6 4 4 5-7 5 7 4-4-2 14H5L3 6Z",
    check: "m4 12 5 5L20 6",
    exit: "M9 3H3v18h6m0-9h13m-5-5 5 5-5 5",
    eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Zm14 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
    dice: "m12 2 10 6v10l-10 5L2 18V8L12 2Zm0 10v11M2 8l10 4 10-4M6 11h.1m2 6h.1M17 15h.1M12 6h.1",
    refresh:
      "M21 3v7h-7M3 21v-7h7M4 8a9 9 0 0 1 15-3l2 5M3 14l2 5a9 9 0 0 0 15-3",
    lock: "M6 10V6a6 6 0 0 1 12 0v4M4 10h16v12H4V10Zm8 4v4",
    help: "M9 9a3 3 0 1 1 4 2.8c-1 .5-1 1.2-1 2.2M12 18h.01M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Z",
    shrink: "M9 3v6H3m18 0h-6V3M3 15h6v6m6 0v-6h6",
    chat: "M21 15a4 4 0 0 1-4 4H8l-6 3 1-7V6a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v9Z",
  };
  const icon = (name, cls = "") =>
    `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.controller}"/></svg>`;
  const mark =
    '<svg class="brand-mark" viewBox="0 0 36 36" aria-hidden="true"><path d="M8 5Q4 3 4 9v19q0 5 5 3l8-5v-6l-6 4V12l14 7-8 5v7l15-10q4-3 0-6L13 5Z" fill="currentColor"/><path d="m20 4 8 4-4 4-8-4Z" fill="currentColor"/></svg>';
  return { icon, mark };
})();
