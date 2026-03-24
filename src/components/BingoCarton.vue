<template>
  <div class="bingo-container">
    <div v-if="ele_actual === 'START'" class="capa-espera-total">
      <div class="tarjeta-blanca-centrada"> 
        <div class="info-espera">
          <h2 class="titulo-espera">Esperando jugadores...</h2>
          <div class="contador-jugadores">
            <span class="numero-jugadores">{{ totalJugadores }}</span>
            <p>conectados actualmente</p>
          </div>
        </div>
        <button @click="comenzarJuego" class="btn-comenzar-pro">¡TODOS LISTOS!</button>
        <p class="sala-id">Código de sala: <strong>{{ props.codigoSala }}</strong></p>
      </div>
    </div>

    <div v-else class="capa-juego-total">
      <div class="tarjeta-juego">
        
        <div class="header-juego">
          <h1 class="titulo-dinamico">{{ nombreTematicaLocal }}</h1>  
          <p class="sala-sub">SALA: <strong>{{ props.codigoSala }}</strong></p>
        </div>

        <div class="item-display-pro">
          <p class="item-nombre">{{ ele_actual }}</p>
          <div class="progreso-votos">
            Votos: {{ votosRecibidos }} / {{ totalJugadores }}
          </div>
        </div>

        <div class="grid-bingo-pro">
          <div 
            v-for="(celda, index) in carton" 
            :key="index" 
            :class="['celda-pro', { marcada: celda.marcada }]"
          >
            {{ celda.nombre || '?' }}
          </div>
        </div>

        <div class="controles-pro">
          <button @click="registrarVoto('si')" :disabled="yaVotado" class="btn-voto btn-si">SÍ</button>
          <button @click="registrarVoto('no')" :disabled="yaVotado" class="btn-voto btn-no">NO</button>
        </div>

        <div class="monitor-votos">
          <p class="txt-quien">¿Quién falta?</p>
          <div class="lista-tags">
            <div v-for="jugador in listaJugadores" :key="jugador" 
                 :class="['tag-pro', { 'voto-listo': hanVotado.includes(jugador) }]">
              {{ jugador }}
            </div>
          </div>
        </div>
      </div>
    </div>

<div v-if="mostrarPopUpLinea && lineaCantadaPor" class="overlay-linea">
  <div class="linea-card">
    <button class="btn-cerrar-modal-pro" @click="mostrarPopUpLinea = false">×</button>
    <span class="emoji-linea">📢</span>
    <h3>¡LÍNEA!</h3>
    <p><strong>{{ lineaCantadaPor }}</strong> ha cantado línea.</p>
  </div>
</div>

<div v-if="alguienHaGanado" class="overlay-ganador">
  <div class="ganador-card">
    <span class="emoji-celebra">🏆</span>
    <h2 class="titulo-bingo-negro">¡BINGO!</h2>
    <p><strong>{{ nombreGanador }}</strong> ha cantado bingo.</p>
    <hr class="divisor-ganador" />
    <button @click="reiniciarTodo" class="btn-reiniciar">
      🔄 Nueva Partida
    </button>
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
    // 1. OBTENER EL ID DE TEMÁTICA ACTUAL DE LA PARTIDA
    // Esto asegura que si la sala cambió de tema, usemos el nuevo
    const { data: partidaActual } = await supabase
      .from('partidas')
      .select('tematica_id')
      .eq('codigo_sala', props.codigoSala)
      .single();

    const idAReferenciar = partidaActual?.tematica_id || props.tematicaId;

    // 2. FILTRAR ÍTEMS POR ESE ID ESPECÍFICO
    const { data: elementos, error: errElem } = await supabase
      .from('items')
      .select('nombre')
      .eq('tematica_id', idAReferenciar); // <--- FILTRO CRÍTICO

    if (errElem || !elementos || elementos.length < 9) {
      console.error("Error o pocos elementos:", errElem);
      return alert("Faltan elementos en esta temática (mínimo 9)");
    }

    // 3. Limpiar votos antiguos de la sala
    await supabase.from('votos').delete().eq('codigo_sala', props.codigoSala);
    
    // 4. Elegir el primer ítem al azar de la lista filtrada
    const azar = Math.floor(Math.random() * elementos.length);
    const primerItem = elementos[azar].nombre;

    // 5. Actualizar la partida en la DB
    await supabase.from('partidas')
      .update({ 
        item_actual_nombre: primerItem, 
        ganador_nombre: null,
        linea_cantada_por: null 
      })
      .eq('codigo_sala', props.codigoSala);

    // Actualizamos los ítems disponibles locales para que el avance automático
    // también use solo los de esta temática
    itemsDisponibles.value = elementos;

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
/* 1. ESTRUCTURA Y CONTENEDORES */
.bingo-container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

.bingo-wrapper {
  width: 100%;
  max-width: 500px;
  padding: 20px;
  text-align: center;
}

/* 2. SALA DE ESPERA (CENTRE-CARD) */
/* --- COPIA Y PEGA ESTO DENTRO DE <style scoped> --- */

.capa-espera-total {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #212529; /* Fondo oscuro */
  z-index: 9999;
  margin: 0;
  padding: 20px;
  box-sizing: border-box;
}

.tarjeta-blanca-centrada {
  background: #ffffff;
  width: 100%;
  max-width: 450px;
  padding: 50px 40px;
  border-radius: 24px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.3);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.titulo-espera {
  font-family: 'Inter', 'Impact', sans-serif;
  font-size: 1.8rem;
  font-weight: 900;
  color: #000;
  margin: 0;
  letter-spacing: -1px;
  text-transform: uppercase;
}

.contador-jugadores {
  background: #f1f5f9;
  padding: 20px;
  border-radius: 20px;
  margin: 10px 0;
}

.numero-jugadores {
  font-family: 'Inter', 'Impact', sans-serif;
  font-size: 4.5rem;
  font-weight: 900;
  color: #000;
  line-height: 1;
  display: block;
}

.contador-jugadores p {
  font-size: 0.8rem;
  font-weight: 800;
  color: #64748b;
  text-transform: uppercase;
  margin-top: 5px;
}

.btn-comenzar-pro {
  width: 100%;
  height: 65px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 1.2rem;
  font-weight: 900;
  text-transform: uppercase;
  cursor: pointer;
}

.sala-id {
  font-size: 0.9rem;
  color: #9ca3af;
  margin: 0;
}
.sala-espera-container {
  position: fixed !important;
  /* Centrado absoluto sin transform */
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  
  /* Esto asegura que el contenedor ocupe TODO el ancho real de la pantalla */
  width: 100vw;
  height: 100vh;
  background-color: #212529; /* Fondo oscuro para ocultar lo de atrás */
  z-index: 99999;
  
  /* Ajuste manual de seguridad */
  /* Si tras poner esto lo sigues viendo a la derecha, 
     pon un número positivo aquí (ej: 10px). 
     Si lo ves a la izquierda, pon uno negativo (ej: -10px). */
  padding-right: 0px; 
}

.login-card-bingo {
  background: #ffffff;
  padding: 40px;
  border-radius: 24px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.3);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 25px;
  
  /* Importante: el ancho de la tarjeta debe ser fijo o controlado */
  width: 90%;
  max-width: 400px;
  margin: 0 auto; /* Refuerzo de centrado interno */
}

.titulo-espera {
  color: #000;
  font-family: 'Inter', 'Impact', sans-serif;
  font-size: 1.8rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -1px;
}

.info-jugadores {
  background: #f1f5f9;
  padding: 25px;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.numero-grande {
  font-family: 'Inter', 'Impact', sans-serif;
  font-size: 5rem;
  font-weight: 900;
  line-height: 1;
}

.texto-conectados {
  font-size: 0.85rem;
  font-weight: 800;
  text-transform: uppercase;
  color: #64748b;
  letter-spacing: 2px;
  margin-top: 10px;
}

/* 3. GRID DE JUEGO */
.grid-bingo {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin: 30px 0;
}

.celda {
  background: #fff;
  border: 2px solid #000;
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 8px;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
}

.marcada {
  background: #000 !important;
  color: #fff !important;
}

/* 4. BOTONES Y CONTROLES */
.btn-comenzar-bingo, .btn-reiniciar {
  width: 100%;
  height: 65px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 900;
  text-transform: uppercase;
  cursor: pointer;
  transition: transform 0.1s;
}

.controles {
  display: flex;
  gap: 15px;
  margin-top: 20px;
}

.btn-hecho, .btn-no {
  flex: 1;
  height: 55px;
  border: none;
  border-radius: 12px;
  color: #fff;
  font-weight: 900;
  cursor: pointer;
}

.btn-hecho { background: #22c55e; }
.btn-no { background: #ef4444; }

.btn-comenzar-bingo:active, .btn-hecho:active, .btn-no:active {
  transform: scale(0.97);
}

/* 5. INTERFACES DE ESTADO (GANADOR / LÍNEA) */
.overlay-ganador, .overlay-linea {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.ganador-card, .linea-card {
  background: #fff;
  padding: 40px;
  border-radius: 24px;
  text-align: center;
  max-width: 320px;
}

.linea-card {
  background: #fef08a;
  border: 4px solid #ca8a04;
}

.titulo-dinamico {
  font-family: 'Inter', 'Impact', sans-serif;
  font-weight: 900;
  font-size: 2rem;
  text-transform: uppercase;
}

/* 6. MONITOR DE JUGADORES */
.monitor-jugadores {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e2e8f0;
}

.tag-jugador {
  margin: 5px;
  padding: 6px 12px;
  border-radius: 20px;
  background: #fff;
  border: 1px solid #e2e8f0;
  font-size: 0.8rem;
  font-weight: 700;
  display: inline-block;
}

.ya-voto {
  background: #dcfce7;
  border-color: #22c55e;
  color: #166534;
}

/* Contenedor principal igual al de espera */
.capa-juego-total {
  min-height: 100vh;
  width: 100vw;
  background-color: #212529;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  box-sizing: border-box;
}

.tarjeta-juego {
  background: #ffffff;
  width: 100%;
  max-width: 450px;
  padding: 30px 25px;
  border-radius: 24px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.3);
  text-align: center;
}

.titulo-dinamico {
  font-family: 'Inter', 'Impact', sans-serif;
  font-size: 1.6rem;
  font-weight: 900;
  text-transform: uppercase;
  margin: 0;
  color: #000;
}

.sala-sub {
  font-size: 0.8rem;
  color: #6b7280;
  letter-spacing: 1px;
  margin-bottom: 20px;
}

/* Panel de la frase/bebida actual */
.item-display-pro {
  background: #f8fafc;
  padding: 15px;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  margin-bottom: 20px;
}

.item-nombre {
  font-size: 1.3rem;
  font-weight: 800;
  color: #000;
  margin: 0;
}

.progreso-votos {
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  margin-top: 5px;
}

/* Grid moderno */
.grid-bingo-pro {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 20px;
}

.celda-pro {
  aspect-ratio: 1/1;
  border: 2px solid #000;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px;
  font-size: 0.7rem;
  font-weight: 900;
  text-transform: uppercase;
  transition: all 0.2s;
}

.celda-pro.marcada {
  background: #000 !important;
  color: #fff !important;
}

/* Botones de acción */
.controles-pro {
  display: flex;
  gap: 12px;
  margin-bottom: 25px;
}

.btn-voto {
  flex: 1;
  height: 55px;
  border: none;
  border-radius: 12px;
  font-family: 'Inter', sans-serif;
  font-weight: 900;
  font-size: 1.1rem;
  cursor: pointer;
  color: #fff;
  transition: transform 0.1s;
}

.btn-si { background: #22c55e; }
.btn-no { background: #ef4444; }
.btn-voto:disabled { background: #cbd5e1; cursor: not-allowed; }
.btn-voto:active { transform: scale(0.95); }

/* Monitor de gente */
.monitor-votos {
  border-top: 1px solid #f1f5f9;
  padding-top: 15px;
}

.txt-quien {
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  color: #94a3b8;
  margin-bottom: 10px;
}

.lista-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
}

.tag-pro {
  padding: 4px 10px;
  border-radius: 20px;
  background: #f1f5f9;
  font-size: 0.7rem;
  font-weight: 700;
  color: #94a3b8;
}

.tag-pro.voto-listo {
  background: #dcfce7;
  color: #16a34a;
}
/* Título de Bingo en negro */
.titulo-bingo-negro {
  color: #000000 !important;
  font-family: 'Inter', 'Impact', sans-serif;
  font-weight: 900;
  font-size: 2.5rem;
  margin: 10px 0;
  text-transform: uppercase;
}

/* Botón de cerrar (la cruz) "Pro" */
.btn-cerrar-modal-pro {
  position: absolute;
  top: 10px;
  right: 15px;
  background: #000; /* Fondo negro para que resalte */
  color: #fff;      /* Cruz blanca */
  border: none;
  width: 30px;
  height: 30px;
  border-radius: 50%; /* Forma circular */
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0,0,0,0.2);
  z-index: 10;
  transition: transform 0.1s;
}

.btn-cerrar-modal-pro:active {
  transform: scale(0.9);
}

/* Ajuste de la tarjeta de línea para que la cruz no tape el contenido */
.linea-card {
  position: relative;
  background: #fef08a;
  padding: 40px 20px 25px; /* Más padding arriba para la cruz */
  border-radius: 24px;
  text-align: center;
  border: 4px solid #ca8a04;
  min-width: 280px;
}

/* Separador más limpio para el ganador */
.divisor-ganador {
  border: none;
  height: 1px;
  background: #eee;
  margin: 20px 0;
}
</style>
