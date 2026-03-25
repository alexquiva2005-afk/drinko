import { supabase } from '../lib/supabaseClient'

export const gameService = {
  // Carga los ítems de una temática
  async getItems(tematicaId) {
    const { data } = await supabase
      .from('items')
      .select('nombre')
      .eq('tematica_id', tematicaId)
    return data || []
  },

  // Cuenta cuántos jugadores hay en la sala (FILTRADO)
  async getJugadoresCount(codigoSala) {
    const { count } = await supabase
      .from('jugadores')
      .select('*', { count: 'exact', head: true })
      .eq('codigo_sala', codigoSala) // <-- Clave para no contar fantasmas de otras salas
    return count || 0
  },

  // Obtiene la lista de nombres que ya han votado este ítem en esta sala
  async getJugadoresQueVotaron(itemNombre, codigoSala) {
    const { data } = await supabase
      .from('votos')
      .select('jugador_nombre')
      .eq('item_nombre', itemNombre)
      .eq('codigo_sala', codigoSala) // <-- Antes tenías partida_id, cambiado a codigo_sala
    return data ? data.map(v => v.jugador_nombre) : []
  },

  // Obtiene todos los jugadores apuntados a esta sala
  async getListaTodosJugadores(codigoSala) {
    const { data } = await supabase
      .from('jugadores')
      .select('nombre')
      .eq('codigo_sala', codigoSala)
    return data ? data.map(j => j.nombre) : []
  },

  // Registra un voto incluyendo quién y dónde
  async registrarVoto(itemNombre, codigoSala, nombreUsuario) {
    await supabase.from('votos').insert({ 
      item_nombre: itemNombre, 
      codigo_sala: codigoSala, // <-- Ajustado a tu SQL
      jugador_nombre: nombreUsuario 
    })
  },

  // Salto global: Cambia el ítem y limpia votos de esa sala
  async saltarSiguiente(codigoSala, nuevoNombre) {
    // 1. Cambiamos el ítem en la partida
    await supabase
      .from('partidas')
      .update({ item_actual_nombre: nuevoNombre })
      .eq('codigo_sala', codigoSala)
    
    // 2. Borramos los votos SOLO de esta sala
    await supabase
      .from('votos')
      .delete()
      .eq('codigo_sala', codigoSala)
  },

  // Notifica ganador
  async notificarBingo(codigoSala, nombreUsuario) {
    await supabase
      .from('partidas')
      .update({ ganador_nombre: nombreUsuario })
      .eq('codigo_sala', codigoSala)
  },

  // Reset total para nueva partida
  async resetearPartida(codigoSala, nuevaTematicaId, nuevoItemInicial) {
    await supabase
      .from('partidas')
      .update({ 
        ganador_nombre: null, 
        item_actual_nombre: nuevoItemInicial,
        tematica_id: nuevaTematicaId 
      })
      .eq('codigo_sala', codigoSala)
      
    await supabase
      .from('votos')
      .delete()
      .eq('codigo_sala', codigoSala)
  }
}