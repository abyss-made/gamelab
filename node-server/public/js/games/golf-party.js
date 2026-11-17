/* Shared Mini Golf mechanics and factual shot labels. No clocks or randomness. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GolfParty = api;
})(globalThis, () => {
  function boost(ball, tiles, used) {
    if (Math.hypot(ball.vx, ball.vy) <= 6) return null;
    for (const tile of tiles || []) {
      if (used.has(tile.id) || ball.x < tile.x || ball.x > tile.x + tile.w || ball.y < tile.y || ball.y > tile.y + tile.h) continue;
      used.add(tile.id);
      // A tile redirects the ball along its painted arrows without slowing a
      // faster shot. Each ball can use each tile only once during a putt.
      const speed = Math.max(tile.speed, Math.hypot(ball.vx, ball.vy));
      ball.vx = Math.cos(tile.angle) * speed;
      ball.vy = Math.sin(tile.angle) * speed;
      return { type: 'boost', obstacleId: tile.id, x: ball.x, y: ball.y, speed };
    }
    return null;
  }

  function finish(strokes, par, impacts = []) {
    const delta = strokes - par;
    const score = strokes === 1 ? 'Hole in one!' : delta <= -3 ? 'Albatross!' : delta === -2 ? 'Eagle!' : delta === -1 ? 'Birdie!' : delta === 0 ? 'Par!' : 'In the cup!';
    const banks = impacts.filter(e => e.type === 'wall').length;
    const style = impacts.some(e => e.type === 'motor') ? 'sweeper' : impacts.some(e => e.type === 'boost') ? 'turbo' : banks ? 'bank' : impacts.some(e => e.type === 'bumper') ? 'bumper' : 'clean';
    const title = strokes === 1 ? score : style === 'sweeper' ? 'Sweeper finish!' : style === 'turbo' ? 'Turbo finish!' : style === 'bank' ? (banks > 1 ? 'Multi-bank finish!' : 'Bank shot!') : style === 'bumper' ? 'Bumper finish!' : score;
    return { title, score, style };
  }

  function recap(players, holeIndex) {
    const rows = players.filter(p => !p.out && Number.isFinite(p.scores[holeIndex]));
    if (!rows.length) return null;
    const total = (p, end) => p.scores.slice(0, end).reduce((sum, s) => sum + (s || 0), 0);
    const ordered = [...rows].sort((a, b) => total(a, holeIndex + 1) - total(b, holeIndex + 1));
    const best = total(ordered[0], holeIndex + 1);
    const leaderIds = ordered.filter(p => total(p, holeIndex + 1) === best).map(p => p.id);
    const previousBest = Math.min(...rows.map(p => total(p, holeIndex)));
    const previousLeaderIds = rows.filter(p => total(p, holeIndex) === previousBest).map(p => p.id);
    const runner = ordered.find(p => !leaderIds.includes(p.id));
    const bestHoleStrokes = Math.min(...rows.map(p => p.scores[holeIndex]));
    return {
      leaderIds,
      lead: runner ? total(runner, holeIndex + 1) - best : 0,
      changedLeader: holeIndex > 0 && leaderIds.length === 1 && !previousLeaderIds.includes(leaderIds[0]),
      bestHoleIds: rows.filter(p => p.scores[holeIndex] === bestHoleStrokes).map(p => p.id),
      bestHoleStrokes,
    };
  }

  return { boost, finish, recap };
});
