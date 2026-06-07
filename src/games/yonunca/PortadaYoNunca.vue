<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../../lib/supabaseClient'
import WaitingRoom from '../../components/WaitingRoom.vue'
import GameBoardYoNunca from './components/GameBoardYoNunca.vue'
import { generarCodigoSala } from '../../utils/roomGenerator'
import { iniciarPartidaYoNunca } from './services/yoNuncaService'

const estado = ref('registro') // 'registro' | 'cargando' | 'espera' | 'jugando'
const nombreUsuario = ref('')
const codigoSala = ref('')
const codigoSugerido = ref('')
const totalJugadores = ref(0)
const fraseActiva = ref('¡Esperando que inicie la partida!')
const listaJugadores =  ref([]) 
const rolesFinales = ref([])

// 🔥 CLAVE PARA REINICIAR EL COMPONENTE TABLERO DESDE CERO
const componenteKey = ref(0)

// Variables secretas locales para el jugador actual
const rolSecreto = ref('sin_rol')
const metaJuegoSecreto = ref('')

let jugadoresSubscription = null
let partidaSubscription = null

onMounted(() => {
  estado.value = 'registro'
  codigoSugerido.value = generarCodigoSala()
})

const usarCodigoSugerido = () => {
  codigoSala.value = codigoSugerido.value
}

const obtenerPreguntaAleatoriaBD = async () => {
  try {
    const { data: preguntas, error } = await supabase
      .from('items')
      .select('nombre')
      .eq('tematica_id', '00000000-0000-0000-0000-000000000001') 
      
    if (error) throw error
    if (preguntas && preguntas.length > 0) {
      return preguntas[Math.floor(Math.random() * preguntas.length)].nombre
    }
    return "Yo nunca..."
  } catch (err) {
    console.error("Error al leer la tabla items:", err)
    return "Yo nunca..."
  }
}

const cargarMiRolSecreto = async (sala, nombre) => {
  const { data } = await supabase
    .from('jugadores')
    .select('rol, meta_juego')
    .eq('codigo_sala', sala)
    .eq('nombre', nombre)
    .maybeSingle()

  if (data) {
    rolSecreto.value = data.rol || 'sin_rol'
    metaJuegoSecreto.value = typeof data.meta_juego === 'object' && data.meta_juego?.palabras_secretas 
      ? data.meta_juego.palabras_secretas.join(', ') 
      : (data.meta_juego || '')
  }
}

const entrarAPartida = async () => {
  if (!nombreUsuario.value || !codigoSala.value) return
  const salaLimpia = codigoSala.value.trim().toUpperCase()
  estado.value = 'cargando'

  try {
    let { data: partida } = await supabase.from('partidas').select('*').eq('codigo_sala', salaLimpia).maybeSingle()

    if (!partida) {
      const fraseInicial = await obtenerPreguntaAleatoriaBD()
      const { data: nueva, error: errCrea } = await supabase
        .from('partidas')
        .insert({ 
          codigo_sala: salaLimpia, 
          item_actual_nombre: fraseInicial, 
          estado: 'espera', 
          tipo_juego: 'yonunca',
          activa: true,
          ultimo_reinicio: new Date().toISOString()
        }).select().single()
      if (errCrea) throw errCrea
      partida = nueva
    }

    const { error: errJugador } = await supabase
      .from('jugadores')
      .insert({ codigo_sala: salaLimpia, nombre: nombreUsuario.value.trim(), rol: 'sin_rol' })
    if (errJugador) throw errJugador

    codigoSala.value = salaLimpia
    fraseActiva.value = partida.item_actual_nombre || 'Yo nunca...'

    await suscribirseAJugadores(salaLimpia)

    if (partida.estado === 'en_juego') {
      await cargarMiRolSecreto(salaLimpia, nombreUsuario.value.trim())
      estado.value = 'jugando'
    } else {
      estado.value = 'espera'
    }

    partidaSubscription = supabase
      .channel(`estado-partida-yonunca-${salaLimpia}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'partidas', filter: `codigo_sala=eq.${salaLimpia}` }, async (payload) => {
        
        // 🚨 CONTROL CRUCIAL: Si el servidor está notificando un reseteo o vuelta a espera,
        // sincronizamos el estado local a 'espera' y no permitimos que se quede colgado en 'jugando'
        if (payload.new.estado === 'espera') {
          estado.value = 'espera'
          if (payload.new.item_actual_nombre) {
            fraseActiva.value = payload.new.item_actual_nombre
          }
          return
        }

        // Si la partida arranca de verdad en el servidor
        if (payload.new.estado === 'en_juego' || payload.new.estado === 'jugando') {
          try {
            await new Promise(resolve => setTimeout(resolve, 250));
            await cargarMiRolSecreto(salaLimpia, nombreUsuario.value.trim())
          } catch (rolError) {
            console.warn("Aviso: No se pudo cargar el rol al instante, reintentando...", rolError)
            try {
              await new Promise(resolve => setTimeout(resolve, 500));
              await cargarMiRolSecreto(salaLimpia, nombreUsuario.value.trim())
            } catch (f) {
              console.error("Error definitivo cargando el rol secreto:", f)
              rolSecreto.value = 'sin_rol' 
            }
          } finally {
            // Sincronizamos la frase activa inicial antes de saltar al tablero
            if (payload.new.item_actual_nombre) {
              fraseActiva.value = payload.new.item_actual_nombre
            }
            estado.value = 'jugando'
          }
        }

        // Actualización estándar de frases durante la partida
        if (payload.new.item_actual_nombre && estado.value === 'jugando') {
          fraseActiva.value = payload.new.item_actual_nombre
        }
      }).subscribe()

  } catch (error) {
    console.error(error)
    estado.value = 'registro'
  }
}

const suscribirseAJugadores = async (salaId) => {
  const actualizarConteoPorPresencia = () => {
    const estadoPresencia = jugadoresSubscription.presenceState()
    const usuariosOnline = []
    
    Object.keys(estadoPresencia).forEach((id) => {
      estadoPresencia[id].forEach((presencia) => {
        if (!usuariosOnline.some(u => u.nombre === presencia.user)) {
          usuariosOnline.push({
            nombre: presencia.user,
            id: id
          })
        }
      })
    })

    listaJugadores.value = usuariosOnline
    totalJugadores.value = usuariosOnline.length
  }

  if (jugadoresSubscription) {
    await supabase.removeChannel(jugadoresSubscription)
  }

  jugadoresSubscription = supabase.channel(`sala-espera-${salaId}`)

  jugadoresSubscription
    .on('presence', { event: 'sync' }, () => {
      actualizarConteoPorPresencia()
    })
    .on('presence', { event: 'join' }, async ({ currentPresences }) => {
      const yoMeHeUnido = currentPresences.some(p => p.user === nombreUsuario.value.trim())
      
      if (yoMeHeUnido) {
        const { data: existeFisicamente } = await supabase
          .from('jugadores')
          .select('id')
          .eq('codigo_sala', salaId)
          .eq('nombre', nombreUsuario.value.trim())
          .maybeSingle()

        if (!existeFisicamente) {
          await supabase
            .from('jugadores')
            .insert({
              codigo_sala: salaId,
              nombre: nombreUsuario.value.trim(),
              rol: 'sin_rol'
            })
        }
      }
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await jugadoresSubscription.track({
          user: nombreUsuario.value.trim(),
          online_at: new Date().toISOString(),
        })
      }
    })
}

const dispararInicioYoNunca = async () => {
  estado.value = 'cargando'
  const resultado = await iniciarPartidaYoNunca(codigoSala.value)
  if (resultado.success) {
    estado.value = 'jugando'
  } else {
    alert("Error: " + resultado.error)
    estado.value = 'espera'
  }
}

// Recibe la ronda desde el GameBoard para actualizar todo en un único impacto
const siguienteFrase = async (proximaRonda) => {
  try {
    const nuevaFrase = await obtenerPreguntaAleatoriaBD()
    
    // Construimos el objeto de actualización de forma inteligente
    const datosAActualizar = { item_actual_nombre: nuevaFrase }
    
    // Si el tablero nos ha mandado un número de ronda, lo agrupamos aquí
    if (proximaRonda) {
      datosAActualizar.ronda_actual = proximaRonda
    }

    // 🚀 UN SOLO UPDATE PARA TODO: Evita colapsar el canal de tiempo real
    await supabase
      .from('partidas')
      .update(datosAActualizar)
      .eq('codigo_sala', codigoSala.value)

  } catch (err) {
    console.error("Error al actualizar la frase y ronda en el padre:", err)
  }
}

// 🔥 REINICIO TOTAL: Deja la base de datos idéntica a cuando se crea la sala
// 🔥 REINICIO TOTAL: Deja la base de datos idéntica a cuando se crea la sala
const manejarRegreso = async () => {
  const salaALimpiar = codigoSala.value

  estado.value = 'cargando'
  
  rolSecreto.value = 'sin_rol'
  metaJuegoSecreto.value = ''

  if (salaALimpiar) {
    try {
      const nuevaFraseInicial = await obtenerPreguntaAleatoriaBD()
      fraseActiva.value = nuevaFraseInicial
      
      // 1. Limpieza radical de votos de la partida anterior
      await supabase
        .from('votos')
        .delete()
        .eq('codigo_sala', salaALimpiar)

      // 2. Manguerazo a la tabla 'jugadores' (resetea roles y limpia palabras viejas del Sabio)
      await supabase
        .from('jugadores')
        .update({ rol: 'sin_rol', meta_juego: null })
        .eq('codigo_sala', salaALimpiar)

      // 3. Reseteo estricto de la mesa de la partida
      await supabase
        .from('partidas')
        .update({ 
          estado: 'espera',                
          item_actual_nombre: nuevaFraseInicial,
          ronda_actual: 1,             // Volvemos a la Ronda 1
          juicio_activo: null,         // Eliminamos juicios activos
          acusacion_firme_hecha: false // 🔥 AQUÍ: El botón de acusar se desbloquea para la nueva partida
        })
        .eq('codigo_sala', salaALimpiar)

      console.log("🔄 Sala completamente desinfectada e inicializada en la Ronda 1.");
    } catch (err) {
      console.error("Error crítico al resetear la sala en Supabase:", err)
    } finally {
      // Forzamos el cambio de Key para destruir el estado interno de robos, mentiras y sabios
      componenteKey.value++
      estado.value = 'espera'
    }
  } else {
    estado.value = 'registro'
  }
}
</script>

<template>
  <div id="app-yonunca">
    <div v-if="estado === 'cargando'" class="pantalla-centrada">
      <div class="login-card card-carga">
        <div class="loader"></div>
        <h2 class="titulo-drinkgo-mini">YO NUNCA</h2>
        <p class="subtexto-carga">Asignando identidades secretas...</p>
        <div class="barra-progreso"><div class="progreso-infinito"></div></div>
      </div>
    </div>

    <div v-else-if="estado === 'registro'" class="pantalla-centrada">
      <div class="background-overlay"></div>
      
      <div class="login-card">
        <div class="header-registro">
          <img src="/logoyonunca.png" alt="Logo" class="logo-registro" />
          <h1 class="titulo-drinkgo">NEVER</h1>
        </div>
        <p class="subtitulo-drinkgo">Roles e Infiltrados</p>
        
        <div class="form-group">
          <input v-model="nombreUsuario" placeholder="Tu Nombre" maxlength="15" />
          <input v-model="codigoSala" placeholder="Código de sala" maxlength="6" @input="codigoSala = codigoSala.toUpperCase()" />
        </div>
        
        <button @click="entrarAPartida" :disabled="!nombreUsuario || !codigoSala">
          Entrar a la sala
        </button>
        
        <p class="codigo-sugerido-texto" @click="usarCodigoSugerido">
          Código sugerido: <strong>{{ codigoSugerido }}</strong>
        </p>
      </div>
    </div>

    <WaitingRoom 
      v-else-if="estado === 'espera'" 
      :totalJugadores="totalJugadores" 
      :codigoSala="codigoSala"
      @comenzar="dispararInicioYoNunca" 
    />

    <GameBoardYoNunca
      v-else-if="estado === 'jugando'" 
      :key="componenteKey"
      :codigoSala="codigoSala"
      :nombreUsuario="nombreUsuario"
      :rolSecreto="rolSecreto"
      :metaJuegoSecreto="metaJuegoSecreto"
      :fraseActiva="fraseActiva"
      :listaJugadores="listaJugadores"
      @siguienteFrase="(proximaRonda) => siguienteFrase(proximaRonda)" 
      @volverAlMenuPrincipal="manejarRegreso"
    />
  </div>
</template>

<style scoped>
/* --- 🌊 ESTILO BASE ULTRA-MODERNO (BLANCO & AZUL) --- */
#app-yonunca {
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
}

/* Capa de luz ambiental azul de fondo */
.background-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: radial-gradient(circle at 50% 40%, rgba(59, 130, 246, 0.15) 0%, transparent 70%);
  pointer-events: none;
  z-index: 1;
}

/* --- 🎴 TARJETA DE ACCESO --- */
.login-card { 
  width: 100%; 
  max-width: 460px; /* ✨ Más estilizada e integrada */
  padding: 45px 40px; 
  background: linear-gradient(145deg, #0f172a 0%, #0b0f19 100%); 
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 24px; 
  display: flex; 
  flex-direction: column; 
  gap: 24px; 
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 
              0 0 40px -5px rgba(59, 130, 246, 0.1); 
}

.header-registro { 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  gap: 16px; 
}

.logo-registro { 
  width: 55px; /* ✨ Reducido tamaño del logo para que sea más elegante */
  height: auto; 
  filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.4));
}

.titulo-drinkgo { 
  font-size: 3.5rem; /* ✨ Reducido drásticamente de 5rem a 3.5rem */
  font-weight: 900; 
  letter-spacing: -1.5px; 
  line-height: 1.1;
  background: linear-gradient(135deg, #ffffff 40%, #93c5fd 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0; 
}

.subtitulo-drinkgo { 
  font-size: 0.9rem; /* ✨ Reducido de 1.2rem a 0.9rem */
  font-weight: 700; 
  color: #3b82f6; /* ✨ Cambiado de rojo oscuro a Azul Eléctrico */
  text-align: center; 
  text-transform: uppercase; 
  letter-spacing: 4px; 
  margin: -10px 0 10px 0;
}

/* --- 📝 ENTRADAS DE TEXTO Y FORMULARIOS --- */
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
  font-size: 0.95rem; /* ✨ Fuente sutilmente más pequeña */
  border: 1px solid rgba(255, 255, 255, 0.08); 
  background: rgba(255, 255, 255, 0.03); 
  font-weight: 600; 
  color: #f8fafc; 
  transition: all 0.3s ease;
}

.login-card input:focus {
  outline: none;
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.05);
  box-shadow: 0 0 15px rgba(59, 130, 246, 0.15);
}

/* --- 🔘 BOTÓN PRINCIPAL --- */
.login-card button { 
  width: 100%; 
  box-sizing: border-box; 
  height: 52px; 
  border-radius: 12px; 
  font-size: 0.95rem; 
  background: #ffffff; /* ✨ Color blanco premium */
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
  background: #3b82f6; /* ✨ Al pasar el ratón se ilumina en azul */
  color: #ffffff;
  box-shadow: 0 0 25px rgba(59, 130, 246, 0.45);
  transform: translateY(-1px);
}

.login-card button:disabled {
  background: rgba(255, 255, 255, 0.05);
  color: #475569;
  cursor: not-allowed;
}

/* --- 🎲 CÓDIGO SUGERIDO --- */
.codigo-sugerido-texto { 
  font-size: 0.8rem; /* ✨ Reducido de 0.85rem a 0.8rem */
  color: #64748b; 
  text-align: center; 
  margin-top: 4px; 
  font-weight: 500; 
  cursor: pointer;
  transition: color 0.2s;
}

.codigo-sugerido-texto:hover {
  color: #3b82f6;
}

.codigo-sugerido-texto strong { 
  font-family: monospace; 
  background: rgba(59, 130, 246, 0.1); 
  color: #93c5fd;
  padding: 3px 8px; 
  border-radius: 6px; 
  border: 1px solid rgba(59, 130, 246, 0.2);
}

/* --- ⏳ PANTALLA Y ANIMACIÓN DE CARGA --- */
.card-carga { 
  max-width: 380px; 
  padding: 40px; 
  align-items: center; 
  text-align: center; 
}

.titulo-drinkgo-mini { 
  font-size: 1.8rem; /* ✨ Reducido de 2.5rem a 1.8rem */
  font-weight: 900; 
  letter-spacing: -0.5px;
  color: #ffffff; 
  margin: 24px 0 6px 0; 
}

.subtexto-carga { 
  font-size: 0.8rem; /* ✨ Reducido de 0.9rem a 0.8rem */
  font-weight: 700; 
  color: #64748b; 
  text-transform: uppercase; 
  letter-spacing: 2px; 
}

.loader { 
  width: 45px; /* ✨ Reducido de 60px a 45px */
  height: 45px; 
  border: 4px solid rgba(255, 255, 255, 0.05); 
  border-top: 4px solid #3b82f6; /* ✨ Detalle azul en el loader */
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
  background: #3b82f6; /* ✨ Barra de progreso azul */
  animation: cargaDeslizar 1.2s infinite linear; 
}

/* --- 🏛️ HEADER JUEGO IN-GAME (Por si se renderiza) --- */
.header-juego { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  padding: 14px 24px; 
  background: #0f172a; 
  border-bottom: 1px solid rgba(255, 255, 255, 0.05); 
  font-size: 0.9rem;
  font-weight: 600; 
  color: #ffffff; 
}

/* --- 🏅 ESTILOS DE ROLES PRIVADOS --- */
.contenedor-rol-privado { display: flex; align-items: center; gap: 8px; }
.mi-rol-badge { padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #fff; background: #475569; }
.badge-mentiroso { background: #ef4444 !important; box-shadow: 0 0 10px rgba(239, 68, 68, 0.3); }
.badge-sabio { background: #f59e0b !important; box-shadow: 0 0 10px rgba(245, 158, 11, 0.3); }
.badge-ladron { background: #3b82f6 !important; box-shadow: 0 0 10px rgba(59, 130, 246, 0.3); }
.badge-sin_rol { background: #64748b !important; }
.btn-info-rol { background: none; border: none; font-size: 1.1rem; cursor: pointer; padding: 0; }

/* --- 📋 MODAL DE ROLES (GLASSMORPHISM) --- */
.modal-info-roles { 
  position: fixed; 
  top: 0; left: 0; 
  width: 100%; height: 100%; 
  background: rgba(4, 6, 11, 0.85); 
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex; 
  justify-content: center; 
  align-items: center; 
  z-index: 999; 
  padding: 24px; 
  box-sizing: border-box;
}

.modal-contenido { 
  background: #0f172a; 
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 35px; 
  border-radius: 24px; 
  max-width: 460px; 
  width: 100%; 
  color: #f8fafc; 
  box-sizing: border-box;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
}

.modal-contenido h3 { 
  margin-top: 0; 
  font-size: 1.25rem; 
  font-weight: 800; 
  border-bottom: 1px solid rgba(255, 255, 255, 0.05); 
  padding-bottom: 14px; 
  color: #ffffff;
}

.modal-contenido ul { 
  padding-left: 20px; 
  display: flex; 
  flex-direction: column; 
  gap: 12px; 
  font-size: 0.9rem; 
  line-height: 1.4rem; 
  text-align: left;
  color: #94a3b8;
}

.palabras-sabio-alerta { 
  display: inline-block; 
  margin-top: 6px; 
  background: rgba(245, 158, 11, 0.1); 
  color: #fbbf24; 
  padding: 4px 10px; 
  border-radius: 6px; 
  font-weight: 700; 
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.btn-cerrar-modal { 
  width: 100%; 
  height: 48px; 
  background: #ffffff; 
  color: #060913; 
  border: none; 
  border-radius: 12px; 
  font-size: 0.9rem;
  font-weight: 800; 
  text-transform: uppercase; 
  margin-top: 24px; 
  cursor: pointer; 
  transition: background 0.2s;
}

.btn-cerrar-modal:hover {
  background: #3b82f6;
  color: #ffffff;
}

/* --- 🎞️ ANIMACIONES --- */
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes cargaDeslizar { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }
</style>