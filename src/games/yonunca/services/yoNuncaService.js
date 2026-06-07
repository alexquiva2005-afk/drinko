import { supabase } from '../../../lib/supabaseClient'
import { repartirRolesJuego } from '../utils/repartidorRoles'

export async function iniciarPartidaYoNunca(codigoSala) {
  try {
    // 1. Limpieza absoluta previa: Borramos de raíz los votos de la partida anterior
    await supabase.from('votos').delete().eq('codigo_sala', codigoSala);

    // 2. Obtener los jugadores de la sala
    const { data: jugadores, error: errJugadores } = await supabase
      .from('jugadores')
      .select('*')
      .eq('codigo_sala', codigoSala);

    if (errJugadores) throw errJugadores;

    // 3. Repartir los roles de forma aleatoria (Mentiroso, Sabio, Ladrón, Inocentes)
    const jugadoresConRoles = repartirRolesJuego(jugadores);

    // 4. Gestión especial del Sabio si aplica
    const indexSabio = jugadoresConRoles.findIndex(j => j.rol === 'sabio');
    
    if (indexSabio !== -1) {
      const { data: bancoPalabras, error: errPalabras } = await supabase
        .from('sabio_palabras')
        .select('palabra')
        .limit(30);

      if (errPalabras) throw errPalabras;

      if (bancoPalabras && bancoPalabras.length >= 3) {
        const palabrasBarajadas = bancoPalabras
          .map(p => p.palabra)
          .sort(() => 0.5 - Math.random())
          .slice(0, 3);

        jugadoresConRoles[indexSabio].meta_juego = palabrasBarajadas.join(', ');
      }
    }

    // 5. Actualizar los roles de todos los jugadores en paralelo (Ultra rápido)
    const promesasJugadores = jugadoresConRoles.map(jugador => {
      return supabase
        .from('jugadores')
        .update({ 
          rol: jugador.rol, 
          meta_juego: jugador.meta_juego 
        })
        .eq('id', jugador.id);
    });
    
    await Promise.all(promesasJugadores);

    // 6. Obtener el mazo de frases de la base de datos
    const { data: todasPreguntas, error: errPreguntas } = await supabase
      .from('items')
      .select('id, nombre')
      .eq('tematica_id', '00000000-0000-0000-0000-000000000001')
      .limit(100);

    if (errPreguntas) throw errPreguntas;
    
    const preguntasPartida = todasPreguntas
      .sort(() => 0.5 - Math.random())
      .slice(0, 20);

    const primeraFraseReal = preguntasPartida.length > 0 
      ? preguntasPartida[0].nombre 
      : '¡Yo nunca...!';

    // 7. 🚀 ACTUALIZACIÓN ÚNICA Y ATÓMICA: 
    // Ponemos todos los contadores a 1, limpiamos juicios y cambiamos el estado de golpe
    const { error: errPartida } = await supabase
      .from('partidas')
      .update({
        estado: 'en_juego',
        item_actual_nombre: primeraFraseReal,
        ronda_actual: 1,               // Fuerza el inicio estricto en la Ronda 1
        juicio_activo: null,           // Desinfecta juicios de la partida anterior
        acusacion_firme_hecha: false,  // Quita bloqueos de acusaciones pasadas
        meta_juego: { 
          preguntas: preguntasPartida, 
          pregunta_actual_index: 0
        }
      })
      .eq('codigo_sala', codigoSala);

    if (errPartida) throw errPartida;

    return { success: true };
  } catch (error) {
    console.error('Error al iniciar la partida del Yo Nunca:', error.message);
    return { success: false, error: error.message };
  }
}