# Hoja de ruta de Aula de Jaque

CEIP Vicente Tofiño · Educación Primaria · Propuestas del alumnado de quinto

El objetivo es ampliar el aula por etapas y conservar lo que ya se usa en clase. Cada fase tiene un resultado que se puede probar antes de empezar la siguiente. La incorporación de funciones con datos del alumnado o comunicación requiere autorización del centro y una comprobación de privacidad y seguridad antes de ofrecer acceso real.

## Punto de partida

| Estado | Qué significa |
| --- | --- |
| **Disponible** | La actividad funciona en la versión comprobada. La publicación se verifica aparte con la dirección que se usa en clase. |
| **En desarrollo** | Existe trabajo de diseño o de programación y todavía faltan comprobaciones, configuración o autorización para su uso previsto. |
| **Pendiente** | Está recogido en esta hoja de ruta. Si aparece en el menú, el estado se indica junto al nombre. |

La base del proyecto es una web que puede abrirse en el navegador. Incluye una introducción al tablero, al caballo y a la torre, los tres minijuegos de caballo, torre y coordenadas, un reto semanal, una actividad para monitores, recursos docentes y una guía para encuentros amistosos. Los minijuegos tienen instrucciones, corrección y mensajes de ánimo. La copia descargable permite usar las actividades locales sin conexión.

La web pública revisada corresponde al commit `9cd5515`. El proyecto conserva por separado la versión multijugador `4ac3df9`, probada localmente con dos sesiones. Esa versión usa salas por código. El servicio figura sin configurar y el sitio público revisado carece de esa función. El tablero sincronizado y la reconexión pueden reutilizarse en la fase 4, con acceso escolar autorizado por el centro.

## Fase 1 · Revisión, menú y diseño general

**Estado.** Implementada y comprobada en la copia de trabajo. La publicación en GitHub Pages sigue pendiente. Las pruebas cubrieron los once apartados, el teclado, los enlaces anteriores, las quince rondas y la edición sin conexión. Queda pendiente la comprobación visual en los dispositivos del centro.

- Revisar la página inicial, los enlaces y rutas existentes, las actividades, el paquete sin conexión y la configuración del servicio de partidas. Anotar qué depende del navegador, del servidor o de una publicación.
- Preparar el acceso a **Juega contra la inteligencia artificial**, **Reta a un compañero**, **Partida aleatoria**, **Academia de ajedrez**, **Zona de juegos y minijuegos**, **Misiones y retos**, **Liga escolar y torneos**, **Tienda**, **Mi perfil**, **Escuela de monitores** y **Rincón del docente**. Dar prioridad visual a lo que se puede utilizar en clase hoy.
- Mantener accesibles las explicaciones introductorias, los tres minijuegos completos, el reto semanal y las propuestas para monitores, docentes y encuentros. Las áreas futuras muestran su estado real. El prototipo de salas privadas se conserva en su versión separada.
- Usar una estética de videojuego educativo apropiada para edades de 6 a 12 años, con botones grandes, iconos acompañados de texto, contraste legible, animación moderada y mensajes de ánimo. Adaptar el diseño a ordenador, tableta, móvil y pizarra digital.

**Arquitectura para decidir las fases siguientes.** El navegador basta para contenidos, ejercicios, minijuegos, práctica libre y una IA que ejecute las jugadas en el dispositivo. También puede guardar un avance local, vinculado a ese navegador. Una base de datos hace falta para perfiles y progreso sincronizados, recompensas, inventarios y competiciones. Un servidor comprueba identidades, permisos, jugadas en red y cambios de puntos o resultados. Para el juego en tiempo real, puede reutilizarse la comunicación WebSocket del servicio existente. Esa conexión permite que ambos tableros reciban las mismas jugadas. Añadir un servicio a la web se puede hacer conservando la dirección pública que ya usa el colegio.

| Opción | Para qué encaja | Qué se comprueba |
| --- | --- | --- |
| Copia local y GitHub Pages | Actividades en el navegador, descarga y una dirección estable para el sitio público. | Las funciones compartidas requieren un servicio adicional. El sitio público solo lleva código y contenidos. |
| Servicio de partidas existente en Cloudflare Workers con SQLite | Comunicar jugadas en directo y guardar el estado temporal de cada sala. | El plan gratuito tiene límites diarios de solicitudes, de tiempo de ejecución y de uso de datos. La prueba de clase debe medirlos y comprobar la recuperación tras desconexiones. |
| Servidor y base de datos con permisos del centro | Perfiles, progreso compartido, recompensas y competiciones. | La elección depende del coste, la seguridad, el borrado, las copias recuperables y las condiciones del proveedor. Se decide antes de la fase 3. |

**Cómo darla por completada.** Los once apartados se encuentran desde la navegación. Los contenidos existentes siguen siendo accesibles, incluido el reto y los consejos de torneo desde sus nuevos apartados. Se comprueba teclado, toque, móvil, tableta y presentación amplia. En cada minijuego se prueba una respuesta incorrecta, un acierto, avanzar y terminar. Se comprueban enlaces anteriores y la apertura sin conexión del ZIP. Se registra por separado qué versión se probó y qué dirección se publicó, cuando proceda.

## Fase 2 · Academia, minijuegos e inteligencia artificial

**Estado.** Primer bloque implementado en la copia de trabajo. Incluye las lecciones de tablero, coordenadas e identificación de piezas, con tres pruebas guiadas, doce ejercicios, avance en el mismo navegador y la insignia «Primeros pasos». Los siguientes bloques, los nuevos minijuegos y el juego contra la máquina siguen previstos.

- Diseñar un itinerario con estas etapas, en orden. Tablero, filas y columnas y coordenadas, identificación de piezas, movimiento del peón, la torre, el alfil, el caballo, la dama y el rey, capturas, jaque, jaque mate, movimientos especiales, estrategias básicas y primeras partidas completas. Cada etapa combina explicación breve, ejemplo interactivo, práctica y reto de comprobación. Mostrar avance, permitir repetir y preparar las recompensas por etapa para su registro seguro en la fase 3.
- Ampliar los juegos con **El laberinto de la torre**, **El caballo aventurero**, **La búsqueda del tesoro**, **Captura todas las piezas**, **Cada pieza a su casa**, **Memoria de piezas**, **Adivina la coordenada**, **Escapa del jaque**, **Jaque mate en un movimiento**, **Jaque mate en dos movimientos**, **Encuentra la mejor jugada**, **Defiende al rey** y retos de lógica y razonamiento. Ofrecer práctica libre con piezas, dificultad graduada cuando sea posible y contrarreloj opcional. Cada juego explica el objetivo, corrige automáticamente y reconoce la finalización.
- Permitir partidas completas contra la IA en **Principiante**, **Fácil**, **Intermedio**, **Avanzado** y **Experto**. Añadir dificultad adaptativa según el rendimiento y los resultados. Permitir escoger color y jugar con o sin reloj.
- Incorporar ayudas educativas activables. Mostrar jugadas legales o piezas amenazadas, pedir pistas, deshacer jugadas en el modo de aprendizaje y explicar errores importantes cuando el motor lo permita. Ofrecer partidas competitivas con ayudas desactivadas.

**Dependencias y decisiones.** Comparar Stockfish y alternativas gratuitas por rendimiento en equipos escolares, compatibilidad sin conexión y obligaciones de licencia. Mantener accesibles los minijuegos durante el cálculo de la IA. El progreso local, si se incorpora antes de los perfiles, permanece ligado al dispositivo y no concede un saldo compartido.

**Cómo darla por completada.** Probar actividades desde la primera etapa hasta una partida completa, repetición y avance local. Comprobar posiciones con jaque, mate y tablas, enroque, captura al paso, promoción y finales por tiempo cuando se use reloj. Evaluar niveles, dificultad adaptativa, ayudas y funcionamiento en equipos representativos del centro.

## Fase 3 · Perfiles, administración básica, recompensas y tienda

**Estado.** Pendiente. Requiere elegir infraestructura y acordar con el centro cómo autoriza y gestiona los perfiles.

- Crear perfiles aprobados por el profesorado mediante accesos individuales. Estudiar cuentas gestionadas o códigos emitidos por el centro con recuperación controlada. Los accesos de docente y alumnado tienen permisos separados y el alta es cerrada. Usar alias y avatares gráficos personalizables. Prescindir del correo personal, fotografías y nombres completos visibles.
- Conservar en el perfil el nivel y la experiencia, las Monedas de Jaque, los puntos de competición, las partidas jugadas, ganadas, empatadas y perdidas, los retos superados, los minijuegos completados, las insignias, el avance en la academia y el inventario. Guardar el progreso entre sesiones y sincronizarlo entre dispositivos cuando se disponga de una infraestructura segura.
- Crear un panel básico protegido para usuarios, cursos, grupos, accesos individuales, permisos, recuperación y activación de funciones. El servidor valida las acciones tanto al entrar como al cambiar un dato. El alumnado solo puede realizar las acciones autorizadas para su propia cuenta.

Propuesta inicial editable en el panel para las **Monedas de Jaque**.

| Actividad | Monedas |
| --- | ---: |
| Completar una lección | 10 |
| Superar un minijuego | 15 |
| Completar una partida | 20 |
| Ganar una partida | 30 en total |
| Superar un reto semanal | 50 |
| Completar una etapa de aprendizaje | 100 |

También se podrán reconocer la participación en competiciones, el esfuerzo, los logros, las insignias y los niveles. La moneda virtual, la experiencia y los puntos de competición se llevan por separado. El servidor aplica los límites por actividad y evita acreditar dos veces la misma recompensa, acumular por repetición artificial o premiar abandonos. La regla de 30 por victoria suma la recompensa completa de esa partida.

- Preparar una tienda de artículos estéticos por categorías y precios. Incluir avatares, sombreros, coronas, gafas, camisetas, trajes, capas, accesorios, fondos, tableros, estilos de piezas, marcos y efectos moderados. Permitir ver una muestra, comprar con monedas, guardar en el inventario, equipar y desequipar. Mantener la competición en igualdad de condiciones y excluir dinero real, compras externas, transferencias y cajas aleatorias.

**Dependencias y decisiones.** Acordar quién administra las altas, el alcance de los permisos, los datos necesarios, los plazos de conservación y borrado, la recuperación, la exportación y las copias. Revisar primero costes y límites del servidor y la base de datos. Si se propone crear cuentas externas, contratar un servicio, pagar o tomar una decisión importante sobre datos, consultarlo antes de proceder. La prueba previa se puede hacer con perfiles ficticios.

**Cómo darla por completada.** Un docente puede crear y recuperar un acceso. Un alumno autorizado puede continuar desde otro dispositivo cuando exista sincronización. Un alumno no puede entrar en el panel ni cambiar su saldo, puntos o resultados. Compras y recompensas siguen siendo correctas con pulsaciones repetidas y dos sesiones concurrentes. Se prueba recuperar, exportar y eliminar un perfil de prueba.

## Fase 4 · Retos entre compañeros, partidas aleatorias y mensajes

**Estado.** Pendiente para la red escolar autorizada. Las salas privadas ya desarrolladas pueden aportar el tablero sincronizado y el mecanismo de reconexión.

- Buscar compañeros autorizados por alias, enviar invitaciones, aceptarlas o rechazarlas, elegir modo rápido o sin presión de tiempo, jugar en directo, ver el resultado, pedir revancha y recibir la recompensa correspondiente. Permitir que el profesorado habilite o deshabilite los retos.
- Emparejar solo a alumnos autorizados y disponibles del colegio. Estudiar partidas libres, por experiencia similar, del mismo curso y abiertas a todo el alumnado autorizado. Si no hay pareja disponible, ofrecer una partida identificada claramente como **contra la inteligencia artificial**.
- Ofrecer frases predeterminadas, como «¡Hola!», «¡Buena suerte!», «¡Buena jugada!», «¡Bien jugado!», «¡Enhorabuena!», «¡Gracias por la partida!», «¿Jugamos otra vez?» y «¡Hasta pronto!». Limitar la frecuencia y permitir desactivarlas. Dejar el chat libre, los mensajes privados, la voz y el micrófono pendientes de valoración por el centro.
- Incorporar misiones individuales, entre compañeros, semanales, por clases, especiales del colegio, de aprendizaje, de lógica y de resolución de posiciones. Cada una indica descripción, objetivo, dificultad y recompensa. Preparar una edición docente sencilla para crear, modificar y publicar retos sin tocar el código. Evitar penalizar los días sin conexión.

**Dependencias y decisiones.** Requiere cuentas y permisos comprobados en la fase 3, un servicio autorizado de comunicación y reglas de privacidad acordadas. El servidor comprueba elegibilidad, invitaciones, turnos, jugadas, reloj, resultados, recompensas y límites de mensajes. El acceso real se activa cuando el centro lo autorice.

**Cómo darla por completada.** Probar con dos dispositivos, reconexión tras un corte, negativa a una invitación, agotamiento del reloj, revancha y sincronización del resultado. Comprobar con perfiles ficticios que no se puede emparejar con personas externas, repetir mensajes sin límite o alterar resultados desde el navegador. Medir un ensayo de 15–20 partidas simultáneas y registrar tiempos de respuesta, incidencias y uso de recursos.

## Fase 5 · Liga escolar y torneos

**Estado.** Pendiente. La guía de encuentros amistosos permite seguir organizando actividades presenciales.

- Crear la liga con temporadas, jornadas, partidas disputadas, resultados, tabla de puntos e historial. Permitir categorías por experiencia, clasificaciones por curso y competiciones por equipos o clases. Dar prioridad a las clasificaciones colectivas. En las individuales mostrar alias, limitar el acceso a participantes autorizados y permitir ocultarlas desde administración.
- Puntuar **1** por victoria, **0,5** por empate y **0** por derrota. Identificar claramente las partidas de liga y las de práctica. Contabilizar el calendario oficial, con controles sobre cruces repetidos, resultados manipulados y ventajas por jugar más partidas.
- Ofrecer torneos por curso, ciclo, centro, nivel o equipos. El profesorado elige participantes, fechas, duración y sistema. Incorporar emparejamientos, registro de resultados, cuadros y clasificaciones. Comparar eliminación directa, todos contra todos y sistema suizo antes de cerrar el alcance de cada modalidad. Generar diplomas y reconocimientos de participación.

**Dependencias y decisiones.** Requiere resultados validados por el servidor, perfiles autorizados y permisos de organización. Acordar calendario, criterios de desempate, tratamiento de ausencias, resultados en disputa y visibilidad de listados y diplomas.

**Cómo darla por completada.** Simular una temporada y un torneo con perfiles ficticios. Verificar puntuación, emparejamientos, resultados corregidos con permiso, desempates, partidas repetidas y ausencia de efectos de la práctica sobre la liga. Probar clasificaciones ocultas y diplomas con los datos autorizados.

## Fase 6 · Panel docente, seguimiento, personalización e integraciones

**Estado.** Pendiente. Amplía las funciones docentes creadas en las fases anteriores.

- Completar un único panel protegido para gestionar usuarios, grupos, cursos, accesos, permisos, retos, torneos, ligas, recompensas, catálogo de la tienda y funciones activas. Añadir incidencias, restablecimiento, borrado y exportación de información útil para seguimiento.
- Incorporar estadísticas de participación y aprendizaje adecuadas a los permisos del centro. Desarrollar las opciones de personalización y medir rendimiento, facilidad de uso, accesibilidad y consumo del servicio en los dispositivos del colegio.
- Investigar si ClassDojo ofrece una integración oficial, gratuita, autorizada y segura. Hacer la evaluación con documentación pública y sin solicitar credenciales. Si no hay una opción adecuada, mantener las recompensas en Aula de Jaque y valorar un resumen exportable que el profesorado pueda trasladar manualmente.
- Conservar la idea de chat, mensajes privados y micrófono para una posible valoración del centro. Cualquier decisión sobre estas funciones requiere una revisión específica y autorización previa.

**Dependencias y decisiones.** Confirmar quién puede exportar, qué datos necesita y durante cuánto tiempo. Revisar costes, continuidad del servicio y obligaciones de los proveedores, con preferencia por soluciones gratuitas y mantenibles. La web prescinde de publicidad, seguimiento comercial y dependencias externas innecesarias.

**Cómo darla por completada.** Comprobar todas las operaciones del panel con perfiles de prueba, incluidos permisos, restablecimiento, incidencias, borrado y exportación. Medir el rendimiento con un escenario de centro. Documentar la conclusión sobre ClassDojo y verificar el resumen manual si se decide incorporarlo.

## Publicación y recuperación

- Antes de cada fase, guardar una versión identificada del código que funciona y una copia descargable, cuando corresponda. Anotar el identificador de GitHub, la fecha, los cambios y las pruebas. Para recuperar una versión debe bastar con localizar esa referencia.
- Probar la ampliación en una copia. Comprobar al terminar cada fase que las actividades anteriores siguen funcionando, que los apartados futuros indican su estado y que las funciones con datos o comunicación respetan lo acordado.
- Para mantener la dirección de la escuela, publicar las actualizaciones en el mismo repositorio y origen de publicación de GitHub Pages. Si hay un servicio de partidas separado, revisar también su dirección, la configuración y la compatibilidad de la versión anterior y la nueva.
- Si una actualización falla, recuperar desde GitHub la última versión comprobada y comprobar la web en el enlace habitual. Si hay perfiles o resultados, preparar además una copia de los datos y probar su restauración antes de cambiar su estructura. Las copias de datos se guardan con acceso restringido y nunca se incluyen en archivos públicos.
