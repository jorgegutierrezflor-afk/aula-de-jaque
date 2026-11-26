(function () {
  'use strict';

  const files = 'abcdefgh';
  const ranks = [8, 7, 6, 5, 4, 3, 2, 1];
  const pieces = [
    { id: 'peon', label: 'Peón', symbol: '♟', description: 'Figura pequeña con una bolita arriba.' },
    { id: 'torre', label: 'Torre', symbol: '♜', description: 'Figura con un borde dentado, como un castillo.' },
    { id: 'alfil', label: 'Alfil', symbol: '♝', description: 'Figura con un gorro alto que tiene una abertura.' },
    { id: 'caballo', label: 'Caballo', symbol: '♞', description: 'Figura con orejas puntiagudas y hocico.' },
    { id: 'dama', label: 'Dama', symbol: '♛', description: 'Figura con una corona de varias puntas.' },
    { id: 'rey', label: 'Rey', symbol: '♚', description: 'Figura con una cruz en lo alto.' }
  ];
  const piecesById = Object.fromEntries(pieces.map((piece) => [piece.id, piece]));

  function pieceQuestion(pieceId, choices, success, retry, prompt = '¿Qué pieza ves?') {
    const { symbol, description } = piecesById[pieceId];
    const options = choices.map((id) => ({ id, label: piecesById[id].label }));

    return { kind: 'piece', prompt, symbol, description, options, answers: [pieceId], success, retry };
  }

  const lessons = {
    tablero: {
      id: 'tablero',
      title: 'El tablero',
      summary: 'Descubre las 64 casillas y aprende a colocar el tablero.',
      explanation: [
        'El tablero tiene 64 casillas en ocho filas y ocho columnas.',
        'Las casillas claras y oscuras se alternan, como los cuadros de un mosaico.',
        'Coloca el tablero con una casilla clara en la esquina de abajo a tu derecha.'
      ],
      example: {
        kind: 'board',
        prompt: 'Toca una casilla clara de la fila de abajo.',
        board: { labels: false, highlight: [] },
        answers: ['b1', 'd1', 'f1', 'h1'],
        success: '¡Bien! En la fila de abajo hay cuatro casillas claras.',
        retry: 'Mira el borde de abajo y busca una casilla de color claro.'
      },
      activities: [
        {
          kind: 'board',
          prompt: 'Toca una casilla oscura de la fila de arriba.',
          board: { labels: false, highlight: [] },
          answers: ['b8', 'd8', 'f8', 'h8'],
          success: '¡Eso es! En la fila de arriba también se alternan los colores.',
          retry: 'Sigue la fila del borde de arriba y busca una casilla oscura.'
        },
        {
          kind: 'board',
          prompt: 'Toca la casilla clara que está en una esquina de abajo.',
          board: { labels: false, highlight: [] },
          answers: ['h1'],
          success: '¡La encontraste! La esquina de abajo a la derecha es clara.',
          retry: 'Mira las dos esquinas de abajo y fíjate en su color.'
        },
        {
          kind: 'board',
          prompt: 'Toca una casilla oscura que comparta un lado con la casilla marcada.',
          board: { labels: false, highlight: ['d5'] },
          answers: ['c5', 'e5', 'd4', 'd6'],
          success: '¡Bien visto! Las casillas que comparten un lado tienen colores distintos.',
          retry: 'Busca la casilla de justo arriba, abajo, a la izquierda o a la derecha de la marcada.'
        }
      ]
    },
    coordenadas: {
      id: 'coordenadas',
      title: 'Coordenadas',
      summary: 'Encuentra cualquier casilla con una letra y un número.',
      explanation: [
        'Las letras de la a a la h indican las columnas, de izquierda a derecha.',
        'Los números del 1 al 8 indican las filas, de abajo arriba.',
        'La coordenada de una casilla se escribe primero con la letra y después con el número.'
      ],
      example: {
        kind: 'board',
        prompt: 'La casilla c3 está marcada. Tócala para comprobar dónde se cruzan su letra y su número.',
        board: { labels: true, highlight: ['c3'] },
        answers: ['c3'],
        success: '¡Así se hace! c3 está en la columna c y en la fila 3.',
        retry: 'Sigue la columna c hacia arriba hasta llegar a la fila 3.'
      },
      activities: [
        {
          kind: 'board',
          prompt: 'Toca la casilla e4.',
          board: { labels: true, highlight: [] },
          answers: ['e4'],
          success: '¡Correcto! Has cruzado la columna e con la fila 4.',
          retry: 'Busca la letra e y sube por esa columna hasta la fila 4.'
        },
        {
          kind: 'board',
          prompt: 'Encuentra la casilla h7.',
          board: { labels: true, highlight: [] },
          answers: ['h7'],
          success: '¡Ya la tienes! h7 está cerca de la esquina de arriba a la derecha.',
          retry: 'Empieza por la columna h, en el borde derecho. Busca la fila 7.'
        },
        {
          kind: 'board',
          prompt: 'Toca la casilla que está en la fila 6 y en la columna b.',
          board: { labels: true, highlight: [] },
          answers: ['b6'],
          success: '¡Exacto! Esa casilla es b6. En la coordenada va primero la letra.',
          retry: 'Sigue la fila 6 hacia la izquierda hasta la columna b.'
        }
      ]
    },
    piezas: {
      id: 'piezas',
      title: 'Las piezas',
      summary: 'Aprende a reconocer las seis figuras del ajedrez.',
      explanation: [
        'Cada jugador empieza con dieciséis piezas. Un jugador usa las blancas y el otro, las negras.',
        'En ambos bandos hay seis tipos de piezas. Fíjate en la forma de cada una.'
      ],
      example: pieceQuestion(
        'caballo', ['caballo', 'torre'],
        '¡Sí! El caballo se reconoce por la forma de su cabeza.',
        'Fíjate en las orejas y el hocico de la figura.',
        'La figura tiene orejas y hocico. ¿Qué pieza es?'
      ),
      activities: [
        pieceQuestion('torre', ['dama', 'torre', 'alfil'], '¡Sí! Es la torre, con su parte de arriba como un castillo.', 'Mira el borde dentado de la figura.'),
        pieceQuestion('alfil', ['alfil', 'rey', 'peon'], '¡Correcto! Es el alfil. Fíjate en su gorro alto.', 'Busca la abertura que tiene en la parte de arriba.'),
        pieceQuestion('caballo', ['alfil', 'peon', 'caballo'], '¡Bien! Has reconocido al caballo por su cabeza.', 'Mira la forma del hocico y las orejas.'),
        pieceQuestion('dama', ['rey', 'dama', 'torre'], '¡Eso es! La dama lleva una corona con varias puntas.', 'Fíjate en las puntas que tiene la corona.'),
        pieceQuestion('rey', ['rey', 'caballo', 'dama'], '¡Exacto! El rey lleva una cruz en lo alto.', 'Busca la cruz en la parte de arriba.'),
        pieceQuestion('peon', ['torre', 'alfil', 'peon'], '¡Bien visto! El peón se reconoce por su bolita.', 'Mira la bolita que tiene encima de la base.')
      ]
    }
  };

  function isCorrect(activity, answer) {
    return activity?.answers?.includes(answer) ?? false;
  }

  const academy = { files, ranks, pieces, lessons, isCorrect };

  if (typeof module === 'object' && module.exports) {
    module.exports = academy;
  } else {
    window.AulaAcademia = academy;
  }
})();
