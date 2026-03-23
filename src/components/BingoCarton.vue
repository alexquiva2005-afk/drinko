<template>
  <div class="bingo-container">
    <div class="bingo-wrapper">
  <h1 class="titulo-dinamico">{{ nombreTematicaLocal }}</h1>
      <p class="sala-sub">Sala: {{ props.codigoSala }}</p>

      <div v-if="ele_actual === 'START'" class="sala-espera">
        <div class="info-espera">
          <h2>Esperando jugadores...</h2>
          <p>Jugadores conectados: {{ totalJugadores }}</p>
        </div>
        <button @click="comenzarJuego" class="btn-comenzar">¡TODOS LISTOS!</button>
      </div>

      <div v-else>

        <div class="item-display">
          <p class="item-nombre">{{ ele_actual }}</p>
          <span class="votos-info">Votos: {{ votosRecibidos }} / {{ totalJugadores }}</span>
        </div>

        <div class="grid-bingo">
          <div 
            v-for="(celda, index) in carton" 
            :key="index" 
            :class="['celda', { marcada: celda.marcada }]"
          >
            {{ celda.nombre || '?' }}
          </div>
        </div>

        <div class="controles">
          <button @click="registrarVoto('si')" :disabled="yaVotado" class="btn-hecho">SÍ</button>
          <button @click="registrarVoto('no')" :disabled="yaVotado" class="btn-no">NO</button>
        </div>

        <div class="monitor-jugadores">
          <p>¿Quién falta?</p>
          <div v-for="jugador in listaJugadores" :key="jugador" 
               :class="['tag-jugador', { 'ya-voto': hanVotado.includes(jugador) }]">
            {{ jugador }} {{ hanVotado.includes(jugador) ? '✅' : '⏳' }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="mostrarPopUpLinea && lineaCantadaPor" class="overlay-linea">
      <div class="linea-card">
        <button class="btn-cerrar-pop" @click="mostrarPopUpLinea = false">×</button>
        <span class="emoji-linea">📢</span>
        <h3>¡LÍNEA!</h3>
        <p><strong>{{ lineaCantadaPor }}</strong> ha sido el más rápido.</p>
      </div>
    </div>

    <div v-if="alguienHaGanado" class="overlay-ganador">
      <div class="ganador-card">
        <span class="emoji-celebra">🏆</span>
        <h2>¡BINGO!</h2>
        <p>Felicidades, <strong>{{ nombreGanador }}</strong></p>
        <hr />
        <button @click="reiniciarTodo" class="btn-reiniciar">
          🔄 Nueva Partida
        </button>
      </div>
    </div>
    <div v-if="mostrarPopUpLinea && lineaCantadaPor" class="overlay-linea">
      <div class="linea-card">
        <button class="btn-cerrar-pop" @click="mostrarPopUpLinea = false">×</button>
        <span class="emoji-linea">📢</span>
        <h3>¡LÍNEA!</h3>
        <p><strong>{{ lineaCantadaPor }}</strong> ha cantado línea.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabaseClient'
import { gameService } from '../services/gameService'

// 1. Recibimos el nombre de la temática desde App.vue
const props = defineProps(['tematicaId', 'nombreTematica', 'codigoSala', 'usuario'])

const itemsDisponibles = ref([])
const ele_actual = ref('START') // Empezamos en modo sala de espera
const carton = ref(Array(9).fill(null).map(() => ({ nombre: '', marcada: false })))
const votosRecibidos = ref(0)
const totalJugadores = ref(0)
const yaVotado = ref(false)
const alguienHaGanado = ref(false)
const nombreGanador = ref('')
const listaJugadores = ref([])
const hanVotado = ref([])
const lineaCantadaPor = ref(null)
const mostrarPopUpLinea = ref(false) // Necesaria para el problema 3
const ultimoReinicioLocal = ref(null) // LA VARIABLE QUE FALTABA
const nombreTematicaLocal = ref(props.nombreTematica);

onMounted(async () => {
  // Cargar ítems nada más entrar para tenerlos listos cuando alguien dé a "Empezar"
  itemsDisponibles.value = await gameService.getItems(props.tematicaId)
  
  // Consultar el estado inicial de la partida
  const { data: partida } = await supabase
    .from('partidas')
    .select('item_actual_nombre, ganador_nombre')
    .eq('codigo_sala', props.codigoSala)
    .single()
    
  if (partida) {
    ele_actual.value = partida.item_actual_nombre
    nombreGanador.value = partida.ganador_nombre
    alguienHaGanado.value = !!partida.ganador_nombre
  }

  await actualizarListaYVotos()
  conectarRealtime()
})


// 1. Función para revisar si hay línea
const tieneLinea = (c) => {
  const m = c.map(celda => celda.marcada);
  const combinaciones = [
    // Horizontales
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    // Verticales
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    // Diagonales
    [0, 4, 8], [2, 4, 6]
  ];
  return combinaciones.some(combo => combo.every(idx => m[idx]));
};
const reiniciarTodo = async () => {
  try {
    // 1. Buscamos un tema nuevo para la siguiente partida
    const { data: todas } = await supabase.from('tematicas').select('*')
    const nuevoTema = todas[Math.floor(Math.random() * todas.length)]

    // 2. Limpiamos los votos de la sala actual para que no afecten a la nueva partida
    await supabase.from('votos').delete().eq('codigo_sala', props.codigoSala)

    // 3. Actualizamos la partida existente:
    // - Volvemos el item_actual a 'START' (esto activa la sala de espera en todos los móviles)
    // - Quitamos el nombre del ganador
    // - Cambiamos el ID de la temática
    // - Reseteamos la columna de la línea cantada
// AÑADE la línea de ultimo_reinicio dentro del update:
await supabase
  .from('partidas')
  .update({ 
    item_actual_nombre: 'START', 
    ganador_nombre: null,
    tematica_id: nuevoTema.id,
    linea_cantada_por: null,
    ultimo_reinicio: new Date().toISOString() // <--- AÑADE ESTA LÍNEA
  })
  .eq('codigo_sala', props.codigoSala);

    if (error) throw error

    // 4. Reset local: Limpiamos nuestro propio cartón y estados
    // No hace falta cambiar de sala, el código de sala (props.codigoSala) se mantiene
    carton.value = Array(9).fill(null).map(() => ({ nombre: '', marcada: false }))
    alguienHaGanado.value = false
    nombreGanador.value = ''
    lineaCantadaPor.value = null
    yaVotado.value = false
    
    console.log("Partida reiniciada en la misma sala con tema:", nuevoTema.nombre)
  } catch (error) {
    console.error("Error al reiniciar la partida:", error)
  } 
}
const conectarRealtime = () => {
  // 1. Definimos un único canal para todo lo relacionado con la sala
  const canal = supabase.channel(`sala-${props.codigoSala}`, {
    config: { 
      presence: { key: props.usuario },
      // Añadimos broadcast para eventos rápidos si fuera necesario en el futuro
    }
  })

  canal
    // A. ESCUCHAR NUEVOS VOTOS (EL CAMBIO CLAVE)
    // Escuchamos CUALQUIER inserción en la tabla votos para esta sala
    .on('postgres_changes', { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'votos',
      filter: `codigo_sala=eq.${props.codigoSala}` 
    }, async (payload) => {
      console.log("Voto recibido de:", payload.new.jugador_nombre);
      // Forzamos la actualización de la lista y el conteo inmediatamente
      await actualizarListaYVotos(); 
    })

.on('postgres_changes', { 
  event: 'UPDATE', 
  schema: 'public', 
  table: 'partidas', 
  filter: `codigo_sala=eq.${props.codigoSala}` 
}, async (payload) => {
  const nueva = payload.new;
  const vieja = payload.old;

  // 1. LÓGICA DEL POP-UP (La versión que funciona)
  // Solo se activa si alguien canta (nueva.linea_cantada_por existe) 
  // Y si el nombre es diferente al que ya tenemos guardado localmente
  if (nueva.linea_cantada_por && nueva.linea_cantada_por !== lineaCantadaPor.value) {
    lineaCantadaPor.value = nueva.linea_cantada_por;
    mostrarPopUpLinea.value = true;
    setTimeout(() => { mostrarPopUpLinea.value = false; }, 5000);
  }

  // Si la DB dice que ya no hay línea (reinicio), limpiamos localmente
  if (!nueva.linea_cantada_por) {
    lineaCantadaPor.value = null;
    mostrarPopUpLinea.value = false;
  }

  // 2. REINICIO GLOBAL (Cartón y estados)
  if (nueva.ultimo_reinicio && nueva.ultimo_reinicio !== ultimoReinicioLocal.value) {
    ultimoReinicioLocal.value = nueva.ultimo_reinicio;
    carton.value = Array(9).fill(null).map(() => ({ nombre: '', marcada: false }));
    yaVotado.value = false;
    alguienHaGanado.value = false;
    nombreGanador.value = '';
  }

  // 3. ACTUALIZAR TEMÁTICA (Si cambia el ID)
  if (nueva.tematica_id !== vieja?.tematica_id) {
    const { data } = await supabase.from('tematicas').select('nombre').eq('id', nueva.tematica_id).single();
    if (data) nombreTematicaLocal.value = data.nombre;
  }

  // 4. SINCRONIZACIÓN DE RONDA
  ele_actual.value = nueva.item_actual_nombre;
  nombreGanador.value = nueva.ganador_nombre;
  alguienHaGanado.value = !!nueva.ganador_nombre;

  // Si cambia el ítem, permitimos votar de nuevo
  if (vieja?.item_actual_nombre !== nueva.item_actual_nombre) {
    yaVotado.value = false; 
  }
  
  await actualizarListaYVotos();
})
    // C. GESTIÓN DE PRESENCIA (Jugadores Online) - SIN TOCAR
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
const comenzarJuego = async () => {
  try {
    // 1. Buscamos elementos de la temática que tiene la partida actualmente
// Antes tenías un .select() general, cámbialo por esto:
const { data: elementos, error: errElem } = await supabase
  .from('items') // Usamos 'items'
  .select('nombre')
  .eq('tematica_id', props.tematicaId); // Filtramos por la temática de la partida
    if (errElem || !elementos || elementos.length < 9) {
      console.error("Error o pocos elementos:", errElem);
      return alert("Faltan elementos en esta temática");
    }

    // 2. Limpiar votos y elegir primer ítem
    await supabase.from('votos').delete().eq('codigo_sala', props.codigoSala);
    const azar = Math.floor(Math.random() * elementos.length);
    const primerItem = elementos[azar].nombre;

    // 3. Actualizar la partida
    await supabase.from('partidas')
      .update({ item_actual_nombre: primerItem, ganador_nombre: null })
      .eq('codigo_sala', props.codigoSala);

  } catch (error) {
    console.error("Error en comenzarJuego:", error);
  }
};

const registrarVoto = async (respuesta) => {
  if (yaVotado.value || alguienHaGanado.value || ele_actual.value === 'START') return;
  yaVotado.value = true;

  if (respuesta === 'si') {
    // 1. Buscamos TODOS los índices de casillas que estén vacías
    const indicesVacios = carton.value
      .map((celda, i) => (celda.nombre === '' ? i : null))
      .filter(i => i !== null);

    if (indicesVacios.length > 0) {
      // 2. Elegimos uno de esos índices al azar
      const indiceAzar = indicesVacios[Math.floor(Math.random() * indicesVacios.length)];
      carton.value[indiceAzar] = { nombre: ele_actual.value, marcada: true };
      // --- NUEVA LÓGICA DE LÍNEA ---
if (!lineaCantadaPor.value && tieneLinea(carton.value)) {
        const { data, error } = await supabase
          .from('partidas')
          .update({ linea_cantada_por: props.usuario })
          .eq('codigo_sala', props.codigoSala)
          .is('linea_cantada_por', null); // ESTO ES LA CLAVE: Solo guarda si sigue vacío
      }

      // 3. Comprobar Bingo (9 casillas marcadas)
      if (carton.value.filter(c => c.marcada).length === 9) {
        await gameService.notificarBingo(props.codigoSala, props.usuario);
      }
    }
  }
  await gameService.registrarVoto(ele_actual.value, props.codigoSala, props.usuario);
};

const actualizarListaYVotos = async () => {
  if (ele_actual.value === 'START') return;

  // 1. Pedimos los votos de este ítem a la DB
  const votosDB = await gameService.getJugadoresQueVotaron(ele_actual.value, props.codigoSala);

  // 2. Usamos la lista de gente online como filtro real
  const conectados = listaJugadores.value;
  if (conectados.length === 0) return; // Evitar división por cero

  // Cruce: Solo votos de gente online
  hanVotado.value = votosDB.filter(nombre => conectados.includes(nombre));
  votosRecibidos.value = hanVotado.value.length;
  totalJugadores.value = conectados.length;

  console.log(`Estado Sala: ${votosRecibidos.value} de ${totalJugadores.value} votos.`);

  // 3. Lógica de Avance Automático
  if (votosRecibidos.value >= totalJugadores.value && totalJugadores.value > 0) {
    
    // Solo el primer jugador online gestiona el cambio (evita saltos dobles)
    if (conectados[0] === props.usuario) {
      console.log("Todos han votado. Buscando siguiente frase...");
      
      const disponibles = itemsDisponibles.value.filter(i => i.nombre !== ele_actual.value);
      if (disponibles.length > 0) {
        const azar = Math.floor(Math.random() * disponibles.length);
        const proximoItem = disponibles[azar].nombre;
        
        // Esta función de tu servicio debe hacer el UPDATE en la tabla 'partidas'
        await gameService.saltarSiguiente(props.codigoSala, proximoItem, ele_actual.value);
      }
    }
  }
}
</script>

<style scoped>
.bingo-wrapper { padding: 10px; font-family: sans-serif; }
.item-display { background: #eee; padding: 10px; margin: 10px 0; text-align: center; }

/* Añadimos margen superior al grid para que bajen las celdas */
.grid-bingo { 
  display: grid; 
  grid-template-columns: repeat(3, 1fr); 
  gap: 8px; /* Un poco más de aire entre celdas */
  max-width: 100%; 
  margin: 30px auto; /* Aumentado de 10px a 30px para que bajen */
}

/* Celdas más legibles en móvil */
.celda { 
  border: 2px solid #000; /* Borde negro más grueso, estilo moderno */
  aspect-ratio: 1 / 1; /* Hacemos que sean perfectamente cuadradas */
  height: auto; /* Quitamos el height fijo de 60px */
  display: flex; 
  align-items: center; 
  justify-content: center; 
  text-align: center;
  padding: 8px;
  font-size: 0.75rem; /* Ajuste de fuente para nombres de bebidas */
  font-weight: 800;
  background: #fff;
  text-transform: uppercase;
}

/* Cuando la celda está marcada, invertimos colores (estética Drinkgo) */
.marcada { 
  background: #000 !important; 
  color: #fff !important; 
}

/* Ajuste del título dentro del juego */
.titulo-dinamico {
  font-family: 'Inter', 'Impact', sans-serif;
  font-weight: 900;
  font-size: 1.8rem;
  text-transform: uppercase;
  margin-bottom: 5px;
}

.controles { display: flex; gap: 10px; justify-content: center; margin-top: 15px; }
.btn-hecho { background: #22c55e; color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; }
.btn-no { background: #ef4444; color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; }
.btn-hecho:disabled, .btn-no:disabled { background: #ccc; cursor: not-allowed; }

.monitor-jugadores { margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
.tag-jugador { margin: 4px; padding: 4px 8px; border: 1px solid #ddd; border-radius: 20px; display: inline-block; font-size: 12px; background: white; }
.ya-voto { background: #dcfce7; border-color: #22c55e; }

/* Contenedor de espera: Blanco puro, sin bordes raros */
.sala-espera { 
  background: #ffffff; 
  padding: 40px 20px; 
  text-align: center; 
  margin: 30px 0; 
}
/* Texto "Esperando jugadores..." en negro y negrita */
.texto-espera {
  font-family: 'Inter', 'Impact', sans-serif;
  color: #000000; /* Negro puro */
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -1px;
}
/* Botón "TODOS LISTOS": Negro sólido y rectangular */
.btn-comenzar { 
  width: 100%;
  max-width: 280px;
  background: #000000; 
  color: #ffffff; 
  border: none; 
  padding: 20px; 
  font-weight: 900; 
  font-size: 1.2rem; 
  cursor: pointer; 
  text-transform: uppercase;
  transition: transform 0.1s;
}
.btn-comenzar:active {
  transform: scale(0.96);
}
/* Estilos del Ganador */
.overlay-ganador { 
  position: fixed; 
  top: 0; left: 0; width: 100%; height: 100%; 
  background: rgba(0,0,0,0.85); 
  display: flex; align-items: center; justify-content: center; 
  z-index: 999; 
}
.ganador-card { 
  background: white; padding: 30px; border-radius: 20px; 
  text-align: center; box-shadow: 0 0 20px #ffd700; color: #333;
}
/* Contador de jugadores más sutil */
.jugadores-count {
  color: #000000;
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 30px;
}
.emoji-celebra { font-size: 50px; display: block; margin-bottom: 10px; }
.btn-reiniciar { background: #000; color: #fff; padding: 12px 20px; border-radius: 10px; border: none; font-weight: bold; cursor: pointer; margin-top: 15px; }
.aviso-linea-mini { background: #fef08a; padding: 5px; border-radius: 5px; margin-bottom: 5px; text-align: center; font-size: 12px; cursor: pointer; border: 1px solid #ca8a04; }
.overlay-linea { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.linea-card { background: #fef08a; padding: 20px; border-radius: 15px; text-align: center; border: 3px solid #ca8a04; position: relative; color: #854d0e; }
.btn-cerrar-pop { position: absolute; top: 5px; right: 10px; background: none; border: none; font-size: 20px; cursor: pointer; }
</style>