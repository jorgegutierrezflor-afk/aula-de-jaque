(function () {
  'use strict';

  function path(prompt, piece, start, blocked, goals, limit, captures) {
    return { kind: 'path', prompt, piece, start, blocked, goals, limit, captures };
  }

  function target(prompt, answers, pieces, success, retry) {
    return { kind: 'target', prompt, answers, board: { pieces }, success, retry };
  }

  function choice(prompt, answer, options, retry, highlight) {
    return {
      kind: 'choice',
      prompt,
      answers: [answer],
      options: options.map((label) => ({ id: label, label })),
      board: highlight ? { highlight: [highlight] } : undefined,
      retry,
    };
  }

  function move(prompt, fen, goal, answers, retry) {
    return { kind: 'move', prompt, fen, goal, answers, retry };
  }

  function memory(pieces) {
    return { kind: 'memory', prompt: 'Mira las piezas. Después de ocultarlas, marca todas las casillas que ocupaban.', pieces, answers: Object.keys(pieces) };
  }

  const games = [
    {
      id: 'laberinto-torre',
      icon: '♜',
      title: 'El laberinto de la torre',
      summary: 'Rodea las barreras y alcanza la salida.',
      instructions: 'Toca una casilla de la misma fila o columna para mover la torre. Rodea las barreras y llega a la meta antes de agotar tus turnos.',
      rounds: [
        path('Lleva la torre de a1 a h8 en cuatro movimientos o menos.', 'r', 'a1', ['b1', 'a5'], ['h8'], 4),
        path('Llega de h1 a a8 en cinco movimientos o menos.', 'r', 'h1', ['h6', 'c1', 'd4', 'e6', 'a5'], ['a8'], 5),
        path('Rodea las barreras y lleva la torre de a8 a h1 en seis movimientos o menos.', 'r', 'a8', ['b8', 'a5', 'f7', 'f5', 'h5', 'g1', 'd3'], ['h1'], 6),
      ],
    },
    {
      id: 'caballo-aventurero',
      icon: '♞',
      title: 'El caballo aventurero',
      summary: 'Visita tres metas saltando en forma de L.',
      instructions: 'En cada salto, el caballo avanza dos casillas en línea recta y una hacia un lado. Puede saltar sobre las barreras si aterriza en una casilla libre.',
      rounds: [
        path('Empieza en b1 y recoge las tres metas en cuatro saltos o menos.', 'n', 'b1', ['a3', 'd2'], ['c3', 'e4', 'g5'], 4),
        path('Desde g1, encuentra el camino hasta e2, d4 y b5.', 'n', 'g1', ['e4', 'h3', 'd2', 'f3'], ['e2', 'd4', 'b5'], 4),
        path('Desde d4, visita las tres metas sin pisar las barreras.', 'n', 'd4', ['f3', 'c6', 'b3', 'h4'], ['f5', 'h6', 'g8'], 4),
      ],
    },
    {
      id: 'busqueda-tesoro',
      icon: '✦',
      title: 'La búsqueda del tesoro',
      summary: 'Recoge las estrellas con tres piezas distintas.',
      instructions: 'Recoge una estrella al terminar tu movimiento en su casilla. Fíjate en la pieza de cada ronda y en las barreras del camino.',
      rounds: [
        path('Guía al alfil por sus diagonales y recoge las estrellas de e5, g7 y h4.', 'b', 'b2', ['d2', 'c5'], ['e5', 'g7', 'h4'], 5),
        path('Mueve la dama en línea recta o diagonal para recoger las tres estrellas.', 'q', 'd4', ['h4', 'd8', 'f5'], ['d7', 'a7', 'f2'], 5),
        path('Recoge las estrellas de e6, h6 y h2 con la torre.', 'r', 'e1', ['e7', 'h7', 'g2'], ['e6', 'h6', 'h2'], 4),
      ],
    },
    {
      id: 'captura-todas',
      icon: '♟',
      title: 'Captura todas las piezas',
      summary: 'Encuentra un camino para capturar todas las piezas negras.',
      instructions: 'Para capturar una pieza negra, termina tu jugada en su casilla. En este ejercicio las piezas negras permanecen quietas.',
      rounds: [
        path('Usa la torre para capturar los tres peones negros.', 'r', 'a1', ['b1', 'g7'], ['a4', 'a8', 'h8'], 4, { a4: '♟', a8: '♟', h8: '♟' }),
        path('Captura las tres piezas negras moviendo el alfil en diagonal.', 'b', 'c1', ['d3'], ['e3', 'h6', 'f8'], 5, { e3: '♟', h6: '♞', f8: '♜' }),
        path('Salta con el caballo y captura las cuatro piezas negras.', 'n', 'f3', ['e5', 'a8'], ['d4', 'c6', 'a7', 'c8'], 6, { d4: '♟', c6: '♝', a7: '♜', c8: '♟' }),
      ],
    },
    {
      id: 'cada-pieza-casa',
      icon: '⌂',
      title: 'Cada pieza a su casa',
      summary: 'Recuerda dónde empieza cada pieza blanca.',
      instructions: 'Toca una casilla de inicio de la pieza que aparece en el centro. Estás colocando las piezas para empezar, como antes de una partida.',
      rounds: [
        target('Coloca la dama blanca en su casilla inicial.', ['d1'], { e4: '♕' }, '¡Bien! La dama blanca empieza en d1, una casilla clara.', 'Busca d1. La dama blanca empieza en una casilla clara.'),
        target('Coloca el rey blanco en su casilla inicial.', ['e1'], { d4: '♔' }, '¡Eso es! El rey blanco empieza en e1.', 'El rey blanco se coloca junto a su dama, en e1.'),
        target('Marca una de las esquinas donde empieza una torre blanca.', ['a1', 'h1'], { d4: '♖' }, '¡Correcto! Las torres empiezan en las esquinas.', 'Mira las dos esquinas de la fila 1.'),
        target('Marca una de las casillas iniciales de los caballos blancos.', ['b1', 'g1'], { d4: '♘' }, '¡Exacto! Los caballos empiezan al lado de las torres.', 'Busca las casillas justo al lado de las esquinas de la fila 1.'),
        target('Marca una de las casillas iniciales de los alfiles blancos.', ['c1', 'f1'], { d4: '♗' }, '¡La encontraste! Los alfiles empiezan junto al rey y la dama.', 'Mira c1 y f1, junto a las dos piezas del centro.'),
        target('Marca una casilla donde empieza un peón blanco.', ['a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2'], { d4: '♙' }, '¡Bien! Los ocho peones blancos empiezan en la fila 2.', 'Busca la fila 2, por delante de las otras piezas blancas.'),
      ],
    },
    {
      id: 'memoria-piezas',
      icon: '◈',
      title: 'Memoria de piezas',
      summary: 'Recuerda dónde estaban las piezas antes de esconderlas.',
      instructions: 'Observa el tablero todo el tiempo que quieras. Cuando estés listo, oculta las piezas y señala las casillas que recuerdes.',
      rounds: [
        memory({ b2: '♘', f5: '♜' }),
        memory({ a7: '♗', d4: '♚', g2: '♙' }),
        memory({ a1: '♖', c7: '♟', e4: '♕', h6: '♞' }),
      ],
    },
    {
      id: 'adivina-coordenada',
      icon: 'a1',
      title: 'Adivina la coordenada',
      summary: 'Descifra el nombre de la casilla marcada.',
      instructions: 'Sigue la columna hasta su letra y la fila hasta su número. Elige la coordenada que empieza por la letra y acaba en el número.',
      rounds: [
        choice('¿Cuál es la coordenada de la casilla marcada?', 'c3', ['c3', 'c6', 'f3'], 'Mira la letra c y el número 3.', 'c3'),
        choice('¿Qué coordenada ves marcada?', 'h7', ['g7', 'h2', 'h7'], 'La marca está en la última columna, cerca de la parte de arriba.', 'h7'),
        choice('¿Cómo se llama la casilla señalada?', 'b6', ['b3', 'b6', 'g6'], 'Sigue la columna b y la fila 6.', 'b6'),
      ],
    },
    {
      id: 'escapa-jaque',
      icon: '♚',
      title: 'Escapa del jaque',
      summary: 'Encuentra una casilla segura para el rey.',
      instructions: 'Juegan las blancas. Toca el rey y luego su destino. Tu rey debe terminar en una casilla que el rival no ataque.',
      rounds: [
        move('La torre negra amenaza al rey. Llévalo a cualquier casilla segura.', 'k3r3/8/8/8/8/8/8/4K3 w - - 0 1', 'legal', undefined, 'Mira a los lados de la columna e.'),
        move('Un caballo negro da jaque. Mueve el rey para escapar.', 'k7/p7/8/8/8/7n/8/6K1 w - - 0 1', 'legal', undefined, 'Imagina los saltos en L del caballo negro y evita sus destinos.'),
        move('La torre y el alfil dan jaque a la vez. Encuentra la única casilla segura.', 'k6r/8/8/3b4/8/8/8/7K w - - 0 1', 'legal', ['h1g1'], 'El alfil domina g2 y la torre domina la columna h.'),
      ],
    },
    {
      id: 'mate-en-uno',
      icon: '1',
      title: 'Jaque mate en un movimiento',
      summary: 'Termina la partida con una sola jugada.',
      instructions: 'Juegan las blancas. Busca un jaque que el rey negro no pueda evitar. Selecciona la pieza y después su destino.',
      rounds: [
        move('Acerca tu dama al rey negro sin que te la pueda capturar.', '7k/8/5KQ1/8/8/8/8/8 w - - 0 1', 'mate', ['g6g7'], 'Busca una casilla de jaque que esté protegida por tu rey.'),
        move('Con el rey blanco protegiendo g7 y g8, da mate con la torre.', '7k/5K1p/8/8/8/8/8/R7 w - - 0 1', 'mate', ['a1a8'], 'La torre puede atacar al rey desde toda la fila 8.'),
        move('La dama puede cerrar la última salida del rey negro.', '7k/5K2/4Q3/8/8/8/8/8 w - - 0 1', 'mate', undefined, 'El rey blanco ya controla g7 y g8. Usa la dama para cerrar la columna h.'),
      ],
    },
    {
      id: 'mate-en-dos',
      icon: '2',
      title: 'Jaque mate en dos movimientos',
      summary: 'Prepara el mate y responde a la defensa.',
      instructions: 'Juegan las blancas. Haz una jugada que prepare el mate. El rey negro responderá. Después da jaque mate.',
      rounds: [
        move('Acerca tu rey. Busca una casilla desde la que pueda ayudar a la dama a dar mate en la jugada siguiente.', '8/k7/8/2K5/1Q6/8/8/8 w - - 0 1', 'mate-two', ['c5c6'], 'Prueba mover tu rey a c6. Desde allí ayudará a la dama a cerrar la salida.'),
        move('El rey negro puede subir o bajar. Coloca tu dama para poder dar mate en ambos casos.', '8/8/k1K3Q1/8/8/8/8/8 w - - 0 1', 'mate-two', ['g6b1'], 'Prueba mover la dama a b1, en la misma columna que necesitará para dar mate.'),
      ],
    },
    {
      id: 'mejor-jugada',
      icon: '♛',
      title: 'Encuentra la mejor jugada',
      summary: 'Compara las capturas y gana la pieza más valiosa.',
      instructions: 'En estas posiciones, busca la captura más valiosa. Para este ejercicio, la dama vale 9, la torre 5, el alfil y el caballo 3 y el peón 1.',
      rounds: [
        move('Tu torre puede capturar la dama o el peón. Elige la captura de más valor.', '7k/3q4/8/8/3R2p1/8/8/K7 w - - 0 1', 'capture', ['d4d7'], 'Una dama vale más que un peón. Mueve la torre por la columna d.'),
        move('Tu caballo puede capturar un alfil o una torre. ¿Cuál vale más?', '7k/8/2b5/5r2/3N4/8/8/K7 w - - 0 1', 'capture', ['d4f5'], 'La torre vale más que el alfil. Busca el salto en L hasta f5.'),
        move('Tu alfil tiene dos capturas. Gana la pieza más valiosa.', '7k/8/5q2/8/3B4/8/1r6/7K w - - 0 1', 'capture', ['d4f6'], 'La dama vale más que la torre. Fíjate en la diagonal de d4 a f6.'),
      ],
    },
    {
      id: 'defiende-rey',
      icon: '♔',
      title: 'Defiende al rey',
      summary: 'Interpone una pieza o captura a quien da jaque.',
      instructions: 'Juegan las blancas. Lee la consigna de cada ronda para saber si debes tapar el ataque o capturar la pieza que da jaque.',
      rounds: [
        move('Coloca tu alfil entre el rey blanco y la torre negra.', 'k3r3/8/8/8/8/8/8/4KB2 w - - 0 1', 'legal', ['f1e2'], 'El alfil puede tapar el ataque entre la torre y el rey en e2.'),
        move('Intercepta con tu torre el jaque del alfil negro.', 'k7/8/8/2b5/8/8/8/5RK1 w - - 0 1', 'legal', ['f1f2'], 'El alfil da jaque por la diagonal c5–g1. Coloca la torre en f2.'),
        move('Captura con tu alfil la torre que da jaque a tu rey.', '7k/8/8/8/8/8/4r3/3BK3 w - - 0 1', 'capture', ['d1e2'], 'El alfil blanco puede capturar la torre en e2 con un paso en diagonal.'),
      ],
    },
    {
      id: 'logica',
      icon: '◇',
      title: 'Retos de lógica',
      summary: 'Cuenta, compara y descubre los patrones del tablero.',
      instructions: 'Lee cada pregunta y elige una respuesta. Puedes probar la posición con tu tablero mientras piensas.',
      rounds: [
        choice('Si el tablero tiene 64 casillas y la mitad son claras, ¿cuántas son claras?', '32', ['16', '32', '48'], 'Divide 64 en dos partes iguales.'),
        choice('El caballo sale de una casilla clara. Si juega dos saltos, ¿de qué color será la casilla final?', 'Clara', ['Clara', 'Oscura', 'Siempre cambia'], 'El caballo cambia de color al hacer cada salto. Cuenta los dos cambios.'),
        choice('Una torre va de a1 a a8 y luego a d8. ¿Cuántas casillas recorre en total?', '10', ['7', '10', '12'], 'Cuenta siete pasos de a1 a a8. Después añade tres pasos hacia d8.'),
      ],
    },
    {
      id: 'practica-libre',
      icon: '♙',
      title: 'Práctica libre',
      summary: 'Mueve las piezas de ambos colores y prueba tus ideas.',
      instructions: 'Juega por turno con las blancas y las negras. Puedes deshacer o volver al principio cuando quieras.',
      rounds: [{ kind: 'free', prompt: 'Empiezan las blancas. Toca una pieza y después su destino.' }],
    },
  ];

  const arcade = { games };
  if (typeof module === 'object' && module.exports) module.exports = arcade;
  else window.AulaArcade = arcade;
}());
