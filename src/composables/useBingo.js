import { ref } from 'vue'
import { supabase } from '../lib/supabaseClient'
import { tieneLinea } from '../utils/bingoRules'

export function useBingo(props) {
  const ele_actual = ref('START')
  const carton = ref(Array(9).fill(null).map(() => ({ nombre: '', marcada: false })))
  const votosRecibidos = ref(0)
  const totalJugadores = ref(0)
  const yaVotado = ref(false)
  const alguienHaGanado = ref(false)
  const nombreGanador = ref('')
  const listaJugadores = ref([])
  const hanVotado = ref([])
  const lineaCantadaPor = ref(null)
  const mostrarPopUpLinea = ref(false)
  const ultimoReinicioLocal = ref(null)
  const nombreTematicaLocal = ref(props.nombreTematica)
  
  let canalSala = null

  

const saltarSiguiente = async () => {
  // 1. Obtenemos la temática REAL de la partida actual directamente de la DB
  const { data: partida } = await supabase
    .from('partidas')
    .select('tematica_id')
    .eq('codigo_sala', props.codigoSala)
    .single();

  if (!partida) return;

  // 2. Buscamos ítems solo de ESA temática
  const { data: elementos } = await supabase
    .from('items')
    .select('nombre')
    .eq('tematica_id', partida.tematica_id); // Usamos el ID de la DB, no el de props

  if (elementos && elementos.length > 0) {
    const disponibles = elementos.filter(i => i.nombre !== ele_actual.value);
    const listaFinal = disponibles.length > 0 ? disponibles : elementos;
    const azar = Math.floor(Math.random() * listaFinal.length);
    const siguienteItem = listaFinal[azar].nombre;

    await supabase.from('partidas')
      .update({ item_actual_nombre: siguienteItem })
      .eq('codigo_sala', props.codigoSala);
  }
}

  const actualizarListaYVotos = async () => {
    const { data: partida } = await supabase
      .from('partidas')
      .select('*')
      .eq('codigo_sala', props.codigoSala)
      .maybeSingle()

    if (partida) {
      // Actualizamos el estado del juego
      ele_actual.value = partida.item_actual_nombre
      ultimoReinicioLocal.value = partida.ultimo_reinicio
      lineaCantadaPor.value = partida.linea_cantada_por
      nombreGanador.value = partida.ganador_nombre
      alguienHaGanado.value = !!partida.ganador_nombre
      
      if (ele_actual.value !== 'START') {
        const { data: vts } = await supabase
          .from('votos')
          .select('jugador_nombre')
          .eq('codigo_sala', props.codigoSala)
          .eq('item_nombre', ele_actual.value)

        if (vts) {
          const conectados = listaJugadores.value
          hanVotado.value = vts.map(v => v.jugador_nombre).filter(u => conectados.includes(u))
          votosRecibidos.value = hanVotado.value.length
          totalJugadores.value = conectados.length
          yaVotado.value = hanVotado.value.includes(props.usuario)

          // LÓGICA DE AVANCE: Si todos han votado, el primero de la lista salta
          if (votosRecibidos.value >= totalJugadores.value && totalJugadores.value > 0) {
            if (conectados[0] === props.usuario) {
              saltarSiguiente()
            }
          }
        }
      }
    }
  }

const registrarVoto = async (opcion) => {
  // 1. Bloqueo de seguridad
  if (yaVotado.value || ele_actual.value === 'START') return

  // 2. REGISTRO EN BASE DE DATOS (Para ambos: SI y NO)
  // Necesitamos que el registro exista para que el contador (votosRecibidos) suba
  const { error } = await supabase.from('votos').insert({
    codigo_sala: props.codigoSala,
    jugador_nombre: props.usuario,
    item_nombre: ele_actual.value
  })

  if (error) {
    console.error("Error al registrar presencia en el voto:", error)
    return
  }

  // 3. LÓGICA EXCLUSIVA DEL "SÍ" (Rellenar cartón)
  if (opcion === 'si') {
    const indicesVacios = carton.value
      .map((c, i) => (c.nombre === '' ? i : null))
      .filter(i => i !== null)

    if (indicesVacios.length > 0) {
      const idx = indicesVacios[Math.floor(Math.random() * indicesVacios.length)]
      carton.value[idx] = { nombre: ele_actual.value, marcada: true }
      
      // Comprobaciones de victoria (Línea/Bingo)
      if (!lineaCantadaPor.value && tieneLinea(carton.value)) {
        await supabase.from('partidas')
          .update({ linea_cantada_por: props.usuario })
          .eq('codigo_sala', props.codigoSala)
          .is('linea_cantada_por', null)
      }
      if (carton.value.filter(c => c.marcada).length === 9) {
        await supabase.from('partidas')
          .update({ ganador_nombre: props.usuario })
          .eq('codigo_sala', props.codigoSala)
      }
    }
  }

  // 4. Bloqueo local de botones
  yaVotado.value = true
}

const comenzarJuego = async () => {
  try {
    // 1. Antes de elegir ítem, comprobamos qué temática tiene asignada la sala REALMENTE en la DB
    const { data: partidaActual, error: errPartida } = await supabase
      .from('partidas')
      .select('tematica_id')
      .eq('codigo_sala', props.codigoSala)
      .single();

    if (errPartida || !partidaActual) {
      console.error("No se pudo obtener la temática de la sala");
      return;
    }

    // 2. Ahora buscamos los ítems usando el ID que acabamos de traer de la DB
    const { data: elementos, error: errItems } = await supabase
      .from('items') 
      .select('nombre')
      .eq('tematica_id', partidaActual.tematica_id); // <--- Uso del ID verificado

    if (errItems || !elementos || elementos.length < 9) {
      console.error("No hay suficientes ítems (mínimo 9) para esta temática.");
      return;
    }

    // 3. Elegimos el primer ítem al azar de la lista correcta
    const azar = Math.floor(Math.random() * elementos.length);
    const primerItem = elementos[azar].nombre;

    // 4. Iniciamos la partida
    await supabase.from('partidas')
      .update({ 
        item_actual_nombre: primerItem,
        ganador_nombre: null,
        linea_cantada_por: null
        // No tocamos ultimo_reinicio aquí para no provocar un reload innecesario al empezar
      })
      .eq('codigo_sala', props.codigoSala);

  } catch (error) {
    console.error("Error crítico al comenzar juego:", error);
  }
}

const reiniciarJuego = async () => {
    try {
      const { data: todas } = await supabase.from('tematicas').select('*')
      const nuevoTema = todas[Math.floor(Math.random() * todas.length)]

      await supabase.from('votos').delete().eq('codigo_sala', props.codigoSala)

      const { error } = await supabase
        .from('partidas')
        .update({ 
          item_actual_nombre: 'START', 
          ganador_nombre: null,
          tematica_id: nuevoTema.id,
          linea_cantada_por: null,
          ultimo_reinicio: new Date().toISOString() 
        })
        .eq('codigo_sala', props.codigoSala);

      if (error) throw error

      // Reset local inmediato
      carton.value = Array(9).fill(null).map(() => ({ nombre: '', marcada: false }))
      alguienHaGanado.value = false
      nombreGanador.value = ''
      lineaCantadaPor.value = null
      yaVotado.value = false
      nombreTematicaLocal.value = nuevoTema.nombre
      
    } catch (error) {
      console.error("Error al reiniciar la partida:", error)
    } 
  }

  const conectarRealtime = () => {
    const canal = supabase.channel(`sala-${props.codigoSala}`, {
      config: { presence: { key: props.usuario } }
    })

    canal
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'votos',
        filter: `codigo_sala=eq.${props.codigoSala}` 
      }, async () => {
        await actualizarListaYVotos(); 
      })

      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'partidas', 
        filter: `codigo_sala=eq.${props.codigoSala}` 
      }, async (payload) => {
        const vieja = payload.old;
        // Dentro de conectarRealtime -> .on('postgres_changes', event: 'UPDATE'...)
        const nueva = payload.new;

        // IMPORTANTE: Solo disparamos el popup si recibimos un nombre 
        // y es DISTINTO al que ya tenemos (para que no salga mil veces)
        if (nueva.linea_cantada_por && nueva.linea_cantada_por !== lineaCantadaPor.value) {
        lineaCantadaPor.value = nueva.linea_cantada_por;
        mostrarPopUpLinea.value = true; // <--- ESTO activa el v-if del popup
        
        // Se cierra solo a los 5 segundos
        setTimeout(() => { 
            mostrarPopUpLinea.value = false; 
        }, 5000);
        }

        // Si en la DB se limpia la línea (reinicio), limpiamos local
        if (!nueva.linea_cantada_por) {
        lineaCantadaPor.value = null;
        mostrarPopUpLinea.value = false;
}

        // 1. Lógica del Pop-up de Línea
        if (nueva.linea_cantada_por && nueva.linea_cantada_por !== lineaCantadaPor.value) {
          lineaCantadaPor.value = nueva.linea_cantada_por;
          mostrarPopUpLinea.value = true;
          setTimeout(() => { mostrarPopUpLinea.value = false; }, 5000);
        }

        if (!nueva.linea_cantada_por) {
          lineaCantadaPor.value = null;
          mostrarPopUpLinea.value = false;
        }

        // 2. Reinicio Global (Detección por timestamp)
        if (nueva.ultimo_reinicio && nueva.ultimo_reinicio !== ultimoReinicioLocal.value) {
          ultimoReinicioLocal.value = nueva.ultimo_reinicio;
          carton.value = Array(9).fill(null).map(() => ({ nombre: '', marcada: false }));
          yaVotado.value = false;
          alguienHaGanado.value = false;
          nombreGanador.value = '';
          votosRecibidos.value = 0;
        }

        // 3. Actualizar Temática si cambia
        if (nueva.tematica_id !== vieja?.tematica_id) {
          const { data } = await supabase.from('tematicas').select('nombre').eq('id', nueva.tematica_id).single();
          if (data) nombreTematicaLocal.value = data.nombre;
        }

        // 4. Sincronización de estado de ronda
        ele_actual.value = nueva.item_actual_nombre;
        nombreGanador.value = nueva.ganador_nombre;
        alguienHaGanado.value = !!nueva.ganador_nombre;

        if (vieja?.item_actual_nombre !== nueva.item_actual_nombre) {
          yaVotado.value = false; 
        }
        
        await actualizarListaYVotos();
      })

      .on('presence', { event: 'sync' }, async () => {
        const state = canal.presenceState();
        const onlineNames = Object.keys(state);
        listaJugadores.value = onlineNames;
        totalJugadores.value = onlineNames.length;
        await actualizarListaYVotos();
      })
      
      .on('presence', { event: 'leave' }, async () => {
        await actualizarListaYVotos();
      })

      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await canal.track({ 
            online_at: new Date().toISOString(),
            nombre: props.usuario 
          });
        }
      });
  }

  return {
    ele_actual, carton, votosRecibidos, totalJugadores, yaVotado,
    alguienHaGanado, nombreGanador, listaJugadores, hanVotado,
    lineaCantadaPor, mostrarPopUpLinea, nombreTematicaLocal,
    actualizarListaYVotos, registrarVoto, comenzarJuego, conectarRealtime, reiniciarJuego
  }
}