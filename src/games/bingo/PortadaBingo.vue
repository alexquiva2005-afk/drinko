<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../../lib/supabaseClient'
import BingoCarton from './components/BingoCarton.vue'
import WaitingRoom from '../../components/WaitingRoom.vue' 
import { generarCodigoSala } from '../../utils/roomGenerator'

const estado = ref('registro') // 'registro' | 'cargando' | 'espera' | 'jugando'
const nombreUsuario = ref('')
const codigoSala = ref('')
const codigoSugerido = ref('')
const tematicaId = ref(null)
const nombreTematica = ref(null)
const totalJugadores = ref(0)
let jugadoresSubscription = null

// 💡 UNIFICADO: Un solo onMounted controlado para inicializar variables limpias
onMounted(() => {
  estado.value = 'registro'
  codigoSugerido.value = generarCodigoSala()
})

const usarCodigoSugerido = () => {
  codigoSala.value = codigoSugerido.value
}

const entrarAPartida = async () => {
  if (!nombreUsuario.value || !codigoSala.value) return
  
  const salaLimpia = codigoSala.value.trim().toUpperCase()
  estado.value = 'cargando'

  try {
    // 1. Buscamos la partida existente vinculando la temática
    let { data: partida } = await supabase
      .from('partidas')
      .select('*, tematicas(id, nombre)')
      .eq('codigo_sala', salaLimpia)
      .maybeSingle()

    // 2. Si no existe, seleccionamos una temática aleatoria real y creamos la partida
    if (!partida) {
      const { data: todas } = await supabase.from('tematicas').select('*')
      
      if (!todas || todas.length === 0) {
        throw new Error("No hay temáticas configuradas en la base de datos.")
      }

      // Selección matemática aleatoria sin sesgo de orden
      const temaAleatorio = todas[Math.floor(Math.random() * todas.length)]

      const { data: nueva, error: errCrea } = await supabase
        .from('partidas')
        .insert({ 
          codigo_sala: salaLimpia, 
          tematica_id: temaAleatorio.id,
          item_actual_nombre: 'START',
          estado: 'espera', 
          tipo_juego: 'bingo',
          activa: true,
          ultimo_reinicio: new Date().toISOString()
        })
        .select('*, tematicas(id, nombre)')
        .single()

      if (errCrea) throw errCrea
      partida = nueva
    } else {
      // Control de juego cruzado por si reutilizan códigos de salas viejas
      if (partida.tipo_juego && partida.tipo_juego !== 'bingo') {
        alert("Este código pertenece a otro juego de la casa")
        estado.value = 'registro'
        return
      }
    }

    // 3. Insertamos al jugador en la tabla
    const { error: errJugador } = await supabase
      .from('jugadores')
      .insert({
        codigo_sala: salaLimpia,
        nombre: nombreUsuario.value.trim(),
        rol: 'jugador'
      })

    if (errJugador) throw errJugador

    // 4. Mapeamos los datos de la temática elegida a los estados reactivos
    tematicaId.value = partida.tematica_id
    nombreTematica.value = partida.tematicas?.nombre || 'Bingo'
    codigoSala.value = salaLimpia

    // 5. Activamos el conteo en tiempo real de la sala de espera
    await suscribirseAJugadores(salaLimpia)

    // 6. Evaluamos el estado real de la sala para saber a dónde mandarlo
    if (partida.estado === 'en_juego') {
      estado.value = 'jugando'
    } else {
      estado.value = 'espera'
    }

    // 7. Canal en tiempo real para saltar al juego cuando el admin inicie la partida
    supabase
      .channel(`estado-partida-bingo-${salaLimpia}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'partidas',
        filter: `codigo_sala=eq.${salaLimpia}`
      }, (payload) => {
        if (payload.new.estado === 'en_juego') {
          estado.value = 'jugando'
          if (jugadoresSubscription) jugadoresSubscription.unsubscribe()
        }
      })
      .subscribe()

  } catch (error) {
    console.error("Error detallado en el Bingo:", error)
    alert(`Error al conectar: ${error.message || JSON.stringify(error)}`)
    estado.value = 'registro'
  }
}

const suscribirseAJugadores = async (salaId) => {
  const actualizarConteo = async () => {
    const { count } = await supabase
      .from('jugadores')
      .select('*', { count: 'exact', head: true })
      .eq('codigo_sala', salaId)
    
    totalJugadores.value = count || 0
  }

  await actualizarConteo()

  jugadoresSubscription = supabase
    .channel(`conteo-jugadores-bingo-${salaId}`)
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'jugadores', 
      filter: `codigo_sala=eq.${salaId}` 
    }, () => {
      actualizarConteo()
    })
    .subscribe()
}

const dispararInicioPartida = async () => {
  try {
    const { error } = await supabase
      .from('partidas')
      .update({ estado: 'en_juego' })
      .eq('codigo_sala', codigoSala.value)

    if (error) throw error
  } catch (err) {
    console.error("No se pudo iniciar el Bingo:", err)
  }
}
</script>

<template>
  <div id="app-bingo">
    <div v-if="estado === 'cargando'" class="pantalla-centrada">
      <div class="login-card card-carga">
        <div class="loader"></div>
        <h2 class="titulo-drinkgo-mini">DRINKGO</h2>
        <p class="subtexto-carga">Preparando la ronda...</p>
        <div class="barra-progreso"><div class="progreso-infinito"></div></div>
      </div>
    </div>

    <div v-else-if="estado === 'registro'" class="pantalla-centrada">
      <div class="background-overlay"></div>
      
      <div class="login-card">
        <div class="header-registro">
          <img src="/logodrinkgo.jpg" alt="Logo" class="logo-registro" />
          <h1 class="titulo-drinkgo">DRINKGO</h1>
        </div>
        <p class="subtitulo-drinkgo">Ludopatía y alcoholismo</p>
        
        <div class="form-group">
          <input v-model="nombreUsuario" placeholder="Nombre" maxlength="15" />
          <input v-model="codigoSala" placeholder="Código de sala" maxlength="6" @input="codigoSala = codigoSala.toUpperCase()" />
        </div>
        
        <button @click="entrarAPartida" :disabled="!nombreUsuario || !codigoSala">
          Entrar a jugar
        </button>
        
        <p class="codigo-sugerido-texto" @click="usarCodigoSugerido">
          Tu código: <strong>{{ codigoSugerido }}</strong>
        </p>
      </div>
    </div>

    <WaitingRoom 
      v-else-if="estado === 'espera'" 
      :totalJugadores="totalJugadores" 
      :codigoSala="codigoSala"
      @comenzar="dispararInicioPartida" 
    />

    <main v-else class="tablero-wrapper">
      <header class="header-juego">
        <span>Sala: <strong class="text-destacado">{{ codigoSala }}</strong></span>
        <span>Jugador: <strong class="text-destacado">{{ nombreUsuario }}</strong></span>
      </header>
      
      <BingoCarton 
        :tematicaId="tematicaId" 
        :nombreTematica="nombreTematica"
        :codigoSala="codigoSala" 
        :usuario="nombreUsuario"
      />
    </main>
  </div>
</template>

<style scoped>
/* --- 🔴 ESTILO NEÓN ROJO & NEGRO --- */
#app-bingo {
  min-height: 100vh;
  background-color: #060913;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  color: #f8fafc;
  position: relative;
  overflow-x: hidden;
}

.pantalla-centrada { 
  min-height: 100vh; 
  display: flex; 
  justify-content: center; 
  align-items: center; 
  padding: 24px; 
  position: relative;
  z-index: 10;
  background-color: transparent !important; /* Quitamos el fondo plano heredado */
}

/* Capa de luz ambiental roja de fondo */
.background-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: radial-gradient(circle at 50% 40%, rgba(239, 68, 68, 0.12) 0%, transparent 70%);
  pointer-events: none;
  z-index: 1;
}

/* --- 🎴 TARJETA DE ACCESO --- */
.login-card { 
  width: 100%; 
  max-width: 460px; 
  padding: 45px 40px; 
  background: linear-gradient(145deg, #110c11 0%, #07070c 100%); 
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 24px; 
  display: flex; 
  flex-direction: column; 
  gap: 24px; 
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6), 
              0 0 40px -5px rgba(239, 68, 68, 0.08); 
}

.header-registro { 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  gap: 16px; 
}

.logo-registro { 
  width: 55px; 
  height: auto; 
  border-radius: 12px;
  filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.3));
  animation: aparecerLogo 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.titulo-drinkgo { 
  font-size: 3.5rem; /* Ajustado de 5rem a 3.5rem */
  font-weight: 900; 
  letter-spacing: -1.5px; 
  line-height: 1.1;
  background: linear-gradient(135deg, #ffffff 40%, #fca5a5 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0; 
}

.subtitulo-drinkgo { 
  font-size: 0.9rem; /* Ajustado de 1.2rem a 0.9rem */
  font-weight: 700; 
  color: #ef4444; /* Rojo vibrante */
  text-align: center; 
  text-transform: uppercase; 
  letter-spacing: 4px; 
  margin: -10px 0 10px 0;
}

/* --- 📝 CONTENEDORES DE TEXTO --- */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.login-card input { 
  width: 100%; 
  box-sizing: border-box; 
  height: 52px; 
  padding: 0 18px; 
  border-radius: 12px; 
  font-size: 0.95rem; 
  border: 1px solid rgba(255, 255, 255, 0.08); 
  background: rgba(255, 255, 255, 0.03); 
  font-weight: 600; 
  color: #f8fafc; 
  transition: all 0.3s ease;
}

.login-card input:focus {
  outline: none;
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.04);
  box-shadow: 0 0 15px rgba(239, 68, 68, 0.15);
}

input::placeholder {
  color: #475569;   
  opacity: 1;      
}

/* --- 🔘 BOTÓN PRINCIPAL (ESTILO NEGRO PREMIUM CON HOVER ROJO) --- */
.login-card button { 
  width: 100%; 
  box-sizing: border-box; 
  height: 52px; 
  border-radius: 12px; 
  font-size: 0.95rem; 
  background: #ffffff; 
  color: #060913; 
  border: none; 
  font-weight: 800; 
  text-transform: uppercase; 
  letter-spacing: 0.5px;
  cursor: pointer; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.login-card button:hover:not(:disabled) { 
  background: #ef4444; 
  color: #ffffff;
  box-shadow: 0 0 25px rgba(239, 68, 68, 0.4);
  transform: translateY(-1px);
}

.login-card button:active:not(:disabled) {
  transform: scale(0.98);
}

.login-card button:disabled {
  background: rgba(255, 255, 255, 0.05);
  color: #475569;
  cursor: not-allowed;
}

/* --- 🎲 CÓDIGO SUGERIDO --- */
.codigo-sugerido-texto { 
  font-size: 0.8rem; 
  color: #64748b; 
  text-align: center; 
  margin-top: 4px; 
  font-weight: 500; 
  cursor: pointer;
  transition: color 0.2s;
}

.codigo-sugerido-texto:hover {
  color: #ef4444;
}

.codigo-sugerido-texto strong { 
  font-family: monospace; 
  background: rgba(239, 68, 68, 0.1); 
  color: #fca5a5;
  padding: 3px 8px; 
  border-radius: 6px; 
  border: 1px solid rgba(239, 68, 68, 0.15);
}

/* --- ⏳ PANTALLA Y ANIMACIÓN DE CARGA --- */
.card-carga { 
  max-width: 380px; 
  padding: 40px; 
  align-items: center; 
  text-align: center; 
}

.titulo-drinkgo-mini { 
  font-size: 1.8rem; /* Ajustado de 2.5rem a 1.8rem */
  font-weight: 900; 
  letter-spacing: -0.5px;
  color: #ffffff; 
  margin: 24px 0 6px 0; 
}

.subtexto-carga { 
  font-size: 0.8rem; 
  font-weight: 700; 
  color: #64748b; 
  text-transform: uppercase; 
  letter-spacing: 2px; 
}

.loader { 
  width: 45px; 
  height: 45px; 
  border: 4px solid rgba(255, 255, 255, 0.05); 
  border-top: 4px solid #ef4444; /* Loader con el toque rojo */
  border-radius: 50%; 
  animation: spin 0.8s linear infinite; 
}

.barra-progreso { 
  width: 100%; 
  height: 4px; 
  background: rgba(255, 255, 255, 0.05); 
  border-radius: 10px; 
  overflow: hidden; 
  margin-top: 8px;
}

.progreso-infinito { 
  width: 40%; 
  height: 100%; 
  background: #ef4444; /* Barra deslizable en rojo */
  animation: cargaDeslizar 1.2s infinite linear; 
}

/* --- 🏛️ IN-GAME HEADER --- */
.tablero-wrapper {
  position: relative;
  z-index: 10;
}

.header-juego { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  padding: 14px 24px; 
  background: #0f1424; 
  border-bottom: 1px solid rgba(255, 255, 255, 0.05); 
  font-size: 0.9rem;
  font-weight: 600; 
  color: #94a3b8; 
}

.text-destacado {
  color: #ffffff;
  border-bottom: 2px solid #ef4444;
  padding-bottom: 2px;
}

/* --- 🎞️ ANIMACIONES --- */
@keyframes aparecerLogo {
  from { opacity: 0; transform: scale(0.9) translateY(-6px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes cargaDeslizar { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }
</style>