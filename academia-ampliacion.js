(function () {
  'use strict';

  const files = 'abcdefgh';
  const figures = {
    P: ['♙', 'peón blanco'], p: ['♟', 'peón negro'],
    R: ['♖', 'torre blanca'], r: ['♜', 'torre negra'],
    N: ['♘', 'caballo blanco'], n: ['♞', 'caballo negro'],
    B: ['♗', 'alfil blanco'], b: ['♝', 'alfil negro'],
    Q: ['♕', 'dama blanca'], q: ['♛', 'dama negra'],
    K: ['♔', 'rey blanco'], k: ['♚', 'rey negro']
  };
  const initial = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  function position(fen, highlight) {
    const pieces = {};
    const rows = fen.split(' ')[0].split('/');
    rows.forEach((row, index) => {
      let column = 0;
      for (const entry of row) {
        if (figures[entry]) {
          const [symbol, description] = figures[entry];
          pieces[`${files[column]}${8 - index}`] = { symbol, description };
          column += 1;
        } else {
          column += Number(entry);
        }
      }
    });
    return { labels: true, highlight, pieces, fen };
  }

  function square(fen, highlight, prompt, answers, success, retry) {
    return { kind: 'board', board: position(fen, highlight), prompt, answers, success, retry };
  }

  function choice(prompt, choices, answer, success, retry, board) {
    const options = choices.map(([id, label]) => ({ id, label }));
    return { kind: 'choice', prompt, options, answers: [answer], success, retry, board };
  }

  const lessons = {
    peon: {
      id: 'peon', title: 'El peón', summary: 'Avanza de frente y aprende cuándo puedes dar dos pasos.',
      explanation: [
        'El peón avanza una casilla hacia el lado rival si la casilla está libre. Las blancas van hacia la fila 8 y las negras hacia la fila 1.',
        'Desde su casilla inicial puede avanzar dos si las dos casillas están libres. Para capturar, el peón va una casilla en diagonal hacia delante.'
      ],
      example: square('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1', ['e2'],
        'Toca la casilla a la que llega el peón blanco de e2 si avanza un paso.', ['e3'],
        '¡Bien! Desde e2, un paso hacia delante lleva a e3.', 'Sigue la columna e hacia arriba y avanza una sola fila.'),
      activities: [
        square('4k3/8/8/8/8/8/3P4/4K3 w - - 0 1', ['d2'],
          'El peón blanco está en su casilla inicial d2. Toca el destino si avanza dos pasos.', ['d4'],
          '¡Exacto! d3 y d4 están libres, así que el peón puede llegar a d4.', 'Cuenta dos casillas de la columna d hacia arriba.'),
        choice('El peón blanco de e4 tiene al peón negro justo delante. ¿Qué puede hacer el peón blanco?',
          [['avanzar', 'Avanzar una casilla'], ['bloqueado', 'Quedarse donde está'], ['capturar', 'Capturar hacia delante']], 'bloqueado',
          '¡Correcto! La casilla de delante está ocupada y un peón captura en diagonal.', 'Fíjate en la casilla de delante. Para avanzar tiene que estar libre.',
          position('4k3/8/8/4p3/4P3/8/8/4K3 w - - 0 1', ['e4', 'e5']))
      ]
    },
    torre: {
      id: 'torre', title: 'La torre', summary: 'Recorre filas y columnas en línea recta.',
      explanation: [
        'La torre se mueve a lo largo de una fila o de una columna.',
        'Puede recorrer varias casillas en un turno mientras tenga el camino libre.'
      ],
      example: square('6k1/8/8/8/3R4/8/8/4K3 w - - 0 1', ['d4'],
        'Toca otra casilla de la fila 4 a la que pueda llegar la torre blanca de d4.', ['a4', 'b4', 'c4', 'e4', 'f4', 'g4', 'h4'],
        '¡Sí! La torre puede ir hacia cualquiera de los dos lados por la misma fila.', 'Busca una casilla a la izquierda o a la derecha de la torre.'),
      activities: [
        square('6k1/8/8/8/1P1R4/8/8/4K3 w - - 0 1', ['d4'],
          'La torre de d4 va a la izquierda. Toca la casilla más lejana que puede alcanzar antes de su peón de b4.', ['c4'],
          '¡Correcto! La torre llega a c4 y ahí se detiene.', 'Sal desde d4 hacia la izquierda y detente antes de la pieza blanca.'),
        square('6k1/8/8/8/8/8/5R2/4K3 w - - 0 1', ['f2'],
          'Toca la casilla más alta de la columna por la que puede subir la torre de f2.', ['f8'],
          '¡Hasta arriba! La columna f queda libre hasta f8.', 'Sigue la columna f hasta la fila 8.')
      ]
    },
    alfil: {
      id: 'alfil', title: 'El alfil', summary: 'Sigue una diagonal y observa el color de sus casillas.',
      explanation: [
        'El alfil avanza en diagonal tantas casillas como tenga libres en su camino.',
        'Las casillas de una diagonal son del mismo color. Por eso cada alfil permanece en el color desde el que empezó.'
      ],
      example: square('6k1/p7/8/8/3B4/8/8/4K3 w - - 0 1', ['d4'],
        'Toca una casilla de la diagonal que sale de d4 hacia arriba y a la derecha.', ['e5', 'f6', 'g7', 'h8'],
        '¡Bien! Cada paso de esta diagonal sube una fila y avanza una columna.', 'Desde el alfil, sube y desplázate a la derecha a la vez.'),
      activities: [
        square('6k1/8/8/8/8/8/3P4/2B1K3 w - - 0 1', ['c1'],
          'Desde c1, toca la casilla más lejana a la que puede llegar el alfil por la diagonal de arriba a la izquierda.', ['a3'],
          '¡La encontraste! El alfil pasa por b2 y llega al borde en a3.', 'Mira la diagonal que pasa por b2 y sigue hasta el borde.'),
        choice('El alfil empieza en la casilla clara e4. ¿De qué color serán las casillas a las que vaya?',
          [['oscuras', 'Oscuras'], ['ambas', 'Claras y oscuras'], ['claras', 'Claras']], 'claras',
          '¡Exacto! Las diagonales que salen de e4 están formadas por casillas claras.', 'Mira las casillas justo en diagonal desde el alfil y compara su color.',
          position('6k1/p7/8/8/4B3/8/8/4K3 w - - 0 1', ['e4']))
      ]
    },
    caballo: {
      id: 'caballo', title: 'El caballo', summary: 'Salta en forma de L, incluso por encima de otras piezas.',
      explanation: [
        'El caballo salta dos casillas en una dirección y una hacia un lado. Su movimiento dibuja una L.',
        'Puede saltar por encima de otras piezas. La casilla donde aterriza puede estar libre u ocupada por una pieza rival.'
      ],
      example: square('6k1/p7/8/8/3N4/8/8/4K3 w - - 0 1', ['d4'],
        'Toca una casilla a la que pueda saltar el caballo de d4.', ['b3', 'b5', 'c2', 'c6', 'e2', 'e6', 'f3', 'f5'],
        '¡Buen salto! El caballo ha recorrido una L.', 'Imagina dos casillas en línea recta y una hacia un lado.'),
      activities: [
        square('6k1/p7/8/8/8/8/8/N3K3 w - - 0 1', ['a1'],
          'El caballo está en a1. ¿A qué casilla de la columna c puede saltar?', ['c2'],
          '¡Eso es! Desde a1, son dos columnas a la derecha y una fila hacia arriba.', 'Busca una casilla de la columna c que esté una fila más arriba que el caballo.'),
        square('4k3/8/8/8/8/8/4PPPP/4KBNR w - - 0 1', ['g1'],
          'El caballo blanco de g1 está rodeado. Toca una casilla libre a la que pueda saltar.', ['f3', 'h3'],
          '¡Lo has conseguido! El caballo puede saltar por encima de sus peones.', 'Sube dos filas y gira una columna hacia la izquierda o la derecha.')
      ]
    },
    dama: {
      id: 'dama', title: 'La dama', summary: 'Combina el movimiento de la torre y el del alfil.',
      explanation: [
        'La dama puede avanzar por una fila, una columna o una diagonal.',
        'En cada jugada sigue una sola línea y necesita un camino libre.'
      ],
      example: square('6k1/8/8/8/3Q4/8/8/4K3 w - - 0 1', ['d4'],
        'Toca otra casilla de la misma columna a la que pueda llegar la dama de d4.', ['d1', 'd2', 'd3', 'd5', 'd6', 'd7', 'd8'],
        '¡Correcto! Por la columna se mueve igual que la torre.', 'Elige otra casilla de la columna d, por encima o por debajo de la dama.'),
      activities: [
        square('6k1/8/8/8/3Q4/8/8/4K3 w - - 0 1', ['d4'],
          'La dama de d4 sube en diagonal a la izquierda. Toca la casilla más lejana que alcanza.', ['a7'],
          '¡La encontraste! En esa diagonal puede pasar por c5 y b6 para llegar a a7.', 'Sube de fila y retrocede de columna en cada paso, hasta llegar al borde.'),
        square('6k1/8/8/8/3Q1P2/8/8/4K3 w - - 0 1', ['d4'],
          'La dama de d4 va a la derecha. Toca la casilla libre que queda antes de su peón de f4.', ['e4'],
          '¡Exacto! El peón blanco detiene a la dama después de e4.', 'Mira la casilla que queda entre la dama y su peón blanco.')
      ]
    },
    rey: {
      id: 'rey', title: 'El rey', summary: 'Da un paso en cualquier dirección y mantente a salvo.',
      explanation: [
        'El rey se mueve una casilla en cualquier dirección.',
        'Tiene que terminar en una casilla segura. Por eso los dos reyes nunca pueden quedar en casillas contiguas.'
      ],
      example: square('7k/p7/8/8/4K3/8/8/8 w - - 0 1', ['e4'],
        'Toca una casilla a la que pueda llegar el rey blanco de e4 en un paso.', ['d3', 'e3', 'f3', 'd4', 'f4', 'd5', 'e5', 'f5'],
        '¡Bien hecho! El rey puede dar un paso hacia cualquiera de las ocho casillas que lo rodean.', 'Busca una casilla que toque a e4 por un lado o por una esquina.'),
      activities: [
        choice('El rey blanco está en e4 y el rey negro en e6. ¿Puede ir el rey blanco a e5?',
          [['si', 'Sí, puede avanzar a e5'], ['cerca', 'No, quedaría junto al rey negro']], 'cerca',
          '¡Eso es! e5 está junto al rey negro y, por tanto, está atacada.', 'Fíjate en qué casilla quedaría el rey blanco y qué pieza tendría justo al lado.',
          position('8/p7/4k3/8/4K3/8/8/8 w - - 0 1', ['e4', 'e5', 'e6'])),
        square('3r3k/8/8/8/4K3/8/8/8 w - - 0 1', ['e4'],
          'La torre negra ataca la columna d. Toca una casilla segura a un paso del rey blanco de e4.', ['e3', 'f3', 'f4', 'e5', 'f5'],
          '¡Bien! Tu rey se ha movido sin entrar en la columna atacada.', 'Evita la columna d y elige una casilla que toque la del rey.')
      ]
    },
    capturas: {
      id: 'capturas', title: 'Captura de piezas', summary: 'Ocupa la casilla de una pieza rival para retirarla del tablero.',
      explanation: [
        'Cuando una pieza captura, se coloca en la casilla de la pieza rival y la retira del tablero.',
        'Torre, alfil, dama, rey y caballo capturan con su movimiento habitual. El peón captura una casilla en diagonal hacia delante.'
      ],
      example: square('6k1/8/3p4/8/3R4/8/8/4K3 w - - 0 1', ['d4'],
        'Captura el peón negro de d6 con la torre blanca de d4.', ['d6'],
        '¡Capturado! La torre pasa por d5 y ocupa d6, la casilla del peón.', 'Sigue la columna d hasta el peón rival.'),
      activities: [
        square('6k1/8/8/2p5/3P4/8/8/4K3 w - - 0 1', ['d4'],
          'Toca la casilla donde el peón blanco de d4 puede capturar.', ['c5'],
          '¡Correcto! El peón avanza una casilla en diagonal hasta c5.', 'Mira las dos casillas diagonales que están delante del peón.'),
        square('6k1/8/5r2/4p3/3B4/8/8/4K3 w - - 0 1', ['d4'],
          'En la diagonal de arriba a la derecha hay dos piezas negras. ¿Cuál puede capturar ahora el alfil de d4?', ['e5'],
          '¡Bien! El alfil captura el peón de e5, la primera pieza rival de la diagonal.', 'Sigue la diagonal desde el alfil y detente en la primera pieza que encuentres.')
      ]
    },
    jaque: {
      id: 'jaque', title: 'Jaque', summary: 'Detecta el ataque al rey y encuentra una forma de defenderlo.',
      explanation: [
        'Hay jaque cuando una pieza rival ataca al rey. La siguiente jugada tiene que dejar al rey a salvo.',
        'A veces puedes mover el rey, capturar la pieza que ataca o colocar una pieza entre el rey y su atacante.'
      ],
      example: square('6k1/4r3/8/8/8/8/8/4K3 w - - 0 1', ['e1'],
        'La torre de e7 da jaque. Toca una casilla segura a la que pueda moverse el rey de e1.', ['d1', 'd2', 'f1', 'f2'],
        '¡Rey a salvo! Al salir de la columna e, esquiva el ataque de la torre.', 'Elige una casilla contigua que esté fuera de la columna e.'),
      activities: [
        square('7k/4r3/8/8/2B5/8/8/4K3 w - - 0 1', ['c4'],
          'Salva al rey de e1. Toca una casilla donde el alfil blanco de c4 pueda cortar el jaque de la torre de e7.', ['e2', 'e6'],
          '¡Buen bloqueo! El alfil se coloca en la columna e entre la torre negra y el rey.', 'Sigue una diagonal del alfil hasta que se cruce con la columna del ataque.'),
        square('6k1/8/8/8/8/8/3Qr3/4K3 w - - 0 1', ['d2'],
          'El rey de e1 está en jaque. Toca la casilla donde la dama blanca de d2 puede capturar la pieza atacante.', ['e2'],
          '¡Así se defiende! La dama captura la torre de e2 y el rey queda a salvo.', 'La pieza que ataca está justo encima del rey. ¿Puede la dama alcanzarla?')
      ]
    },
    mate: {
      id: 'mate', title: 'Jaque mate', summary: 'Encuentra el ataque del que el rey rival ya no puede escapar.',
      explanation: [
        'Hay jaque mate cuando el rey está atacado y ninguna jugada legal consigue salvarlo. La partida termina en ese momento.',
        'Si al jugador le toca mover, su rey está a salvo y ninguna de sus piezas puede hacer una jugada legal, hay tablas por ahogado.'
      ],
      example: square('7k/8/5KQ1/8/8/8/8/8 w - - 0 1', ['g6'],
        'Mueve la dama blanca de g6 una casilla hacia arriba para dar mate al rey de h8.', ['g7'],
        '¡Jaque mate! La dama ataca h8 y el rey blanco de f6 la protege.', 'Mira la casilla g7. Desde allí, la dama ataca en diagonal al rey negro.'),
      activities: [
        square('6k1/5ppp/8/8/8/8/8/K3R3 w - - 0 1', ['e1'],
          'Toca una casilla para que la torre de e1 dé mate al rey negro en una jugada.', ['e8'],
          '¡Mate! La torre ataca desde la fila 8 y los peones negros cierran la salida del rey.', 'Sube la torre hasta la fila donde está el rey negro.'),
        choice('Juegan las negras. Su rey de h8 está a salvo, pero no tiene ninguna jugada legal. ¿Cómo termina?',
          [['mate', 'Jaque mate'], ['sigue', 'Las negras pasan el turno'], ['ahogado', 'Tablas por ahogado']], 'ahogado',
          '¡Eso es! Sin jaque y sin jugadas legales, la partida acaba en tablas.', 'Para que sea mate, el rey tiene que estar atacado en su casilla actual.',
          position('7k/5K2/6Q1/8/8/8/8/8 b - - 0 1', ['h8']))
      ]
    },
    'movimientos-especiales': {
      id: 'movimientos-especiales', title: 'Movimientos especiales', summary: 'Prueba el enroque, la captura al paso y la coronación.',
      explanation: [
        'En el enroque, el rey se mueve dos casillas hacia una torre y esta salta a su otro lado. Ambos deben seguir en sus casillas iniciales y no haberse movido. El camino tiene que estar libre y el rey no puede comenzar, pasar ni terminar en una casilla atacada.',
        'Puedes capturar al paso justo después de que un peón rival avance dos casillas y quede al lado del tuyo. Tu peón captura en diagonal hacia la casilla por la que pasó.',
        'Cuando un peón llega a la última fila, corona. Se cambia por una dama, torre, alfil o caballo de su color.'
      ],
      example: square('4k3/8/8/8/8/8/8/4K2R w K - 0 1', ['e1', 'h1'],
        'El rey de e1 y la torre de h1 pueden enrocarse. Toca la casilla donde quedará el rey.', ['g1'],
        '¡Enroque! El rey queda en g1 y la torre pasa a f1.', 'El rey avanza dos casillas hacia la torre de h1.'),
      activities: [
        choice('La torre negra de f8 ataca f1. ¿Puede el rey blanco enrocarse con la torre de h1?',
          [['si', 'Sí, porque hay sitio entre sus piezas'], ['atacada', 'No, porque el rey tendría que pasar por f1']], 'atacada',
          '¡Correcto! El rey no puede pasar por una casilla atacada al enrocarse.', 'Sigue el camino del rey desde e1 hasta g1 y fíjate en f1.',
          position('k4r2/8/8/8/8/8/8/4K2R w K - 0 1', ['e1', 'f1', 'h1'])),
        square('6k1/8/8/3pP3/8/8/8/4K3 w - d6 0 2', ['e5', 'd5'],
          'El peón negro acaba de ir de d7 a d5. Toca la casilla a la que va el peón blanco de e5 si captura al paso.', ['d6'],
          '¡Captura al paso! El peón blanco ocupa d6 y retira el peón negro de d5.', 'Piensa en la casilla que cruzó el peón negro antes de llegar a d5.'),
        choice('El peón blanco de a7 va a llegar a a8. ¿En cuál de estas piezas puede convertirse?',
          [['rey', 'Rey'], ['peon', 'Peón'], ['caballo', 'Caballo']], 'caballo',
          '¡Bien! Puedes elegir caballo, alfil, torre o dama al coronar.', 'Al coronar se elige una pieza distinta del peón y del rey.',
          position('6k1/P7/8/8/8/8/8/4K3 w - - 0 1', ['a7', 'a8']))
      ]
    },
    estrategias: {
      id: 'estrategias', title: 'Estrategias básicas', summary: 'Pon tus piezas en juego, controla el centro y detecta amenazas.',
      explanation: [
        'Al empezar, intenta controlar el centro. Sus cuatro casillas son d4, e4, d5 y e5.',
        'Saca caballos y alfiles de la fila inicial. Antes de mover, mira qué ataca tu rival y si tus piezas siguen a salvo.',
        'Una pieza puede amenazar dos objetivos a la vez. Cuando lo hace el caballo, esta jugada se llama tenedor.'
      ],
      example: square(initial, ['d2'],
        'Juegan las blancas. Avanza el peón de d2 hasta una de las cuatro casillas del centro.', ['d4'],
        '¡Buena apertura! El peón ocupa d4 y abre camino a otras piezas.', 'Busca una casilla del centro que esté en la columna d.'),
      activities: [
        square('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', ['g1', 'e5'],
          'Mueve el caballo blanco de g1 a una casilla desde la que ataque al peón negro de e5.', ['f3'],
          '¡Buen desarrollo! Desde f3 tu caballo puede saltar a e5.', 'Prueba un salto hacia el centro. Luego imagina otra L desde allí hasta e5.'),
        square('1k1q3r/8/8/4N3/8/8/8/4K3 w - - 0 1', ['e5'],
          'Mueve el caballo blanco de e5 a una casilla desde la que ataque a la dama de d8 y a la torre de h8.', ['f7'],
          '¡Buen tenedor! Desde f7 hay un salto en L hasta cada pieza rival.', 'Busca una casilla desde la que puedas dibujar una L hacia d8 y otra hacia h8.')
      ]
    },
    'primeras-partidas': {
      id: 'primeras-partidas', title: 'Primeras partidas', summary: 'Practica el inicio y el final de una partida antes de jugar una completa.',
      explanation: [
        'Las blancas mueven primero y después los jugadores se turnan. En la apertura, pon tus piezas en juego y protege a tu rey.',
        'En cada turno, mira si tu rey está en jaque, qué amenaza tu rival y qué puedes hacer. La partida puede acabar en victoria de uno de los jugadores o en tablas.',
        'Después de esta práctica, prueba una partida completa desde el apartado «Juega contra la inteligencia artificial».'
      ],
      example: square(initial, ['e2'],
        'Empieza la partida con las blancas. Toca el destino si el peón de e2 avanza dos casillas.', ['e4'],
        '¡Ya has hecho la primera jugada! Ahora les toca jugar a las negras.', 'Avanza por la columna e desde la segunda hasta la cuarta fila.'),
      activities: [
        square('rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2', ['d8'],
          'Las blancas han dejado su rey expuesto. Toca la casilla donde la dama negra de d8 puede dar mate.', ['h4'],
          '¡Mate en h4! Las negras ganan. El rey blanco de e1 está en la diagonal de la dama.', 'Busca la diagonal que sale de d8 hacia abajo y a la derecha. El peón negro de e7 ya se ha movido.'),
        choice('Tras una partida completa, el resultado es tablas. ¿Qué se anota?',
          [['blancas', 'Victoria de las blancas'], ['empate', 'Empate'], ['negras', 'Victoria de las negras']], 'empate',
          '¡Exacto! Tablas significa empate. Ya puedes probar una partida completa.', 'Piensa en un resultado en el que ambos jugadores acaban sin ganar.')
      ]
    }
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = lessons;
  } else {
    Object.assign(window.AulaAcademia.lessons, lessons);
  }
})();
