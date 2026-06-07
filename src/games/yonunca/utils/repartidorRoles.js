/**
 * Asigna los roles ocultos a los jugadores de forma aleatoria según las reglas del juego.
 * @param {Array} listaJugadores - Array de objetos con los jugadores de la sala
 * @returns {Array} Lista de jugadores con su rol ya asignado
 */
export function repartirRolesJuego(listaJugadores) {
  const totalJugadores = listaJugadores.length;
  let poolRoles = [];

  // Reglas estrictas solicitadas:
  if (totalJugadores === 3 || totalJugadores === 4) {
    poolRoles = ['mentiroso'];
  } else if (totalJugadores === 5) {
    poolRoles = ['mentiroso', 'sabio'];
  } else if (totalJugadores >= 6) {
    poolRoles = ['mentiroso', 'sabio', 'ladrón']; // Con tilde para que coincida con el GameBoard
  }

  // Rellenamos el resto con 'inocente' de forma consistente
  while (poolRoles.length < totalJugadores) {
    poolRoles.push('inocente');
  }

  // Barajamos
  for (let i = poolRoles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [poolRoles[i], poolRoles[j]] = [poolRoles[j], poolRoles[i]];
  }

  return listaJugadores.map((jugador, index) => ({
    ...jugador,
    rol: poolRoles[index],
    meta_juego: null
  }));
}