(function (global) {
  "use strict";

  const levels = Object.freeze({
    principiante: { label: "Principiante", depth: 1, budget: 65, randomness: 720, choices: 12 },
    facil: { label: "Fácil", depth: 1, budget: 120, randomness: 220, choices: 7 },
    intermedio: { label: "Intermedio", depth: 2, budget: 240, randomness: 55, choices: 4 },
    avanzado: { label: "Avanzado", depth: 3, budget: 420, randomness: 15, choices: 3 },
    experto: { label: "Experto", depth: 4, budget: 680, randomness: 0, choices: 1 },
  });
  const pieceValue = { p: 100, n: 320, b: 335, r: 500, q: 950, k: 0 };
  const mate = 100000;
  const stop = Symbol("límite de búsqueda");
  const files = "abcdefgh";
  const pause = () => new Promise((resolve) => global.setTimeout(resolve, 0));
  const now = () => global.performance.now();
  const algebraic = (index) => files[index & 7] + (8 - (index >> 4));

  function evaluate(board, player) {
    let material = 0;
    let white = 0;
    const kings = [];

    for (let row = 0; row < 8; row++) {
      for (let column = 0; column < 8; column++) {
        const piece = board[row * 16 + column];
        if (!piece) continue;
        if (piece.type === "k") {
          kings.push({ row, column, color: piece.color });
          continue;
        }

        const center = 7 - Math.abs(column - 3.5) - Math.abs(row - 3.5);
        const advance = piece.color === "w" ? 6 - row : row - 1;
        const positional = piece.type === "p" ? advance * 7 + center * 3
          : piece.type === "n" ? center * 10
          : piece.type === "b" ? center * 6
          : center * 2;
        white += (pieceValue[piece.type] + positional) * (piece.color === "w" ? 1 : -1);
        if (piece.type !== "p") material += pieceValue[piece.type];
      }
    }

    for (const { row, column, color } of kings) {
      const home = color === "w" ? 7 : 0;
      const center = 7 - Math.abs(column - 3.5) - Math.abs(row - 3.5);
      const position = material < 1500 ? center * 8
        : (row === home && [1, 2, 6].includes(column) ? 34 : 0) - center * 6;
      white += position * (color === "w" ? 1 : -1);
    }

    return white * (player === "w" ? 1 : -1);
  }

  function priority(move) {
    return (move.captured ? 10 * pieceValue[move.captured] - pieceValue[move.piece] : 0)
      + (move.promotion ? pieceValue[move.promotion] * 4 : 0);
  }

  function* checkpoint(context) {
    if (++context.nodes % 24 !== 0) return;
    const current = now();
    if (context.signal?.aborted || current >= context.deadline) throw stop;
    if (current >= context.nextYield) {
      yield;
      context.nextYield = now() + 7;
    }
  }

  // These fast move helpers come from the bundled, pinned chess.js 1.4.0.
  // The game interface applies each chosen move through the public API.
  function* search(context, depth, alpha, beta, ply) {
    yield* checkpoint(context);
    const game = context.game;
    const moves = game._moves();
    if (!moves.length) return game.isCheck() ? -mate + ply : 0;
    if (game.isInsufficientMaterial()) return 0;
    if (depth === 0) return evaluate(game._board, game.turn());

    moves.sort((a, b) => priority(b) - priority(a));
    let best = -Infinity;
    for (const move of moves) {
      game._makeMove(move);
      let score;
      try {
        score = -(yield* search(context, depth - 1, -beta, -alpha, ply + 1));
      } finally {
        game._undoMove();
      }
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
      if (alpha >= beta) break;
    }
    return best;
  }

  function* searchRoot(context, moves, depth, onlyBest) {
    let best = -Infinity;
    const scored = [];
    for (const move of moves) {
      yield* checkpoint(context);
      context.game._makeMove(move);
      let score;
      try {
        score = -(yield* search(context, depth - 1, -Infinity, onlyBest ? -best : Infinity, 1));
      } finally {
        context.game._undoMove();
      }
      best = Math.max(best, score);
      scored.push({ move, score });
    }
    return scored.sort((a, b) => b.score - a.score);
  }

  async function choose(Chess, fen, level, options = {}) {
    const profile = levels[level] || levels.intermedio;
    const { signal, random = Math.random } = options;
    const game = new Chess(fen);
    const moves = game._moves().sort((a, b) => priority(b) - priority(a));
    if (!moves.length || signal?.aborted) return null;

    const deadline = now() + profile.budget;
    const context = { game, signal, deadline, nextYield: now() + 7, nodes: 0 };
    let completed = moves.map((move) => ({ move, score: priority(move) }));
    let searched = 0;
    try {
      for (let depth = 1; depth <= profile.depth; depth++) {
        const iteration = searchRoot(context, completed.map(({ move }) => move), depth, profile.choices === 1);
        let next = iteration.next();
        while (!next.done) {
          await pause();
          next = iteration.next();
        }
        completed = next.value;
        searched = depth;
        if (now() >= deadline || completed[0].score > mate - 10) break;
      }
    } catch (error) {
      if (error !== stop) throw error;
    }
    if (signal?.aborted) return null;

    const candidates = completed.slice(0, profile.choices);
    let chosen = candidates[0];
    let best = -Infinity;
    for (const candidate of candidates) {
      const rank = candidate.score + random() * profile.randomness;
      if (rank > best) {
        best = rank;
        chosen = candidate;
      }
    }
    const { from, to, promotion } = chosen.move;
    return { from: algebraic(from), to: algebraic(to), promotion, depth: searched };
  }

  const engine = { choose, levels, pieceValue };
  if (typeof module !== "undefined" && module.exports) module.exports = engine;
  else global.AulaIA = engine;
})(globalThis);
