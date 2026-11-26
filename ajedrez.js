(function () {
  'use strict';

  const files = 'abcdefgh';
  const ranks = Object.freeze([8, 7, 6, 5, 4, 3, 2, 1]);
  const squares = Object.freeze(ranks.flatMap((rank) => Array.from(files, (file) => `${file}${rank}`)));

  const games = Object.freeze({
    caballo: Object.freeze({
      title: 'Movimientos del caballo',
      piece: 'caballo',
      instructions: 'Elige una casilla a la que pueda saltar el caballo. Avanza dos casillas en una dirección y una hacia un lado.',
      hint: 'Imagina una L de dos casillas de largo y una de ancho.'
    }),
    torre: Object.freeze({
      title: 'Movimientos de la torre',
      piece: 'torre',
      instructions: 'Elige otra casilla de la misma fila o columna que la torre. Puede avanzar tantas casillas como quiera si el camino está libre.',
      hint: 'Mira a los lados y arriba o abajo desde la torre.'
    }),
    coordenadas: Object.freeze({
      title: 'Coordenadas del tablero',
      piece: null,
      instructions: 'Busca la casilla indicada. La letra marca la columna y el número marca la fila.',
      hint: 'Sigue la columna de la letra y la fila del número hasta que se crucen.'
    })
  });

  function destinations(gameId, from) {
    if ((gameId !== 'caballo' && gameId !== 'torre') || !squares.includes(from)) {
      return [];
    }

    const fromFile = files.indexOf(from[0]);
    const fromRank = Number(from[1]);

    return squares.filter((square) => {
      const fileDistance = Math.abs(files.indexOf(square[0]) - fromFile);
      const rankDistance = Math.abs(Number(square[1]) - fromRank);

      if (gameId === 'caballo') {
        return (fileDistance === 1 && rankDistance === 2) || (fileDistance === 2 && rankDistance === 1);
      }

      return (fileDistance === 0 && rankDistance > 0) || (rankDistance === 0 && fileDistance > 0);
    });
  }

  function round(gameId, previousRound, random = Math.random) {
    if (!Object.prototype.hasOwnProperty.call(games, gameId)) {
      throw new RangeError('El minijuego no existe.');
    }

    const isCoordinates = gameId === 'coordenadas';
    const previousSquare = previousRound?.gameId === gameId
      ? (isCoordinates ? previousRound.target : previousRound.from)
      : null;
    const choices = squares.filter((square) => square !== previousSquare);
    const chosen = choices[Math.floor(random() * choices.length)];

    if (isCoordinates) {
      return { gameId, from: null, target: chosen, answers: [chosen] };
    }

    return { gameId, from: chosen, target: null, answers: destinations(gameId, chosen) };
  }

  function correct(currentRound, square) {
    return Boolean(currentRound && squares.includes(square) && currentRound.answers.includes(square));
  }

  const AulaJaque = Object.freeze({ files, ranks, squares, games, destinations, round, correct });

  if (typeof module === 'object' && module.exports) {
    module.exports = AulaJaque;
  } else {
    window.AulaJaque = AulaJaque;
  }
})();
