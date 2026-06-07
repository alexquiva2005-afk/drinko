<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { supabase } from '../../../lib/supabaseClient'

import PanelMentiroso from './PanelMentiroso.vue'
import PanelSabio from './PanelSabio.vue' 
import InfoRolesModal from './InfoRolesModal.vue'
import PanelLadron from './PanelLadron.vue'
import PantallaResumen from './PantallaResumen.vue'

let miCanalPartida = null
let miCanalVotos = null

const props = defineProps({
  codigoSala: String,
  nombreUsuario: String,
  rolSecreto: String,
  metaJuegoSecreto: [String, Object, Array],
  fraseActiva: String,
  listaJugadores: { type: Array, default: () => [] }
})

// --- 🔄 ESTADOS REACTIVOS LOCALES (F5 Proof) ---
const miRolLocal = ref(props.rolSecreto)
const miMetaJuegoLocal = ref(props.metaJuegoSecreto)
const partidaTerminadaAlcanzada = ref(false)
const rolesFinales = ref([]) // ✨ AGREGADO: Declaración que faltaba para evitar caídas

// --- GENERADOR DE PALABRAS PARA EL SABIO ---
const inicializarPalabrasSabio = async () => {
  if (miMetaJuegoLocal.value) {
    console.log("🧠 SABIO: Ya existen palabras locales:", miMetaJuegoLocal.value)
    return
  }

  try {
    console.log("🧠 SABIO: Buscando palabras en la tabla 'sabio_palabras'...")
    
    const { data: todasLasPalabras, error } = await supabase
      .from('sabio_palabras')
      .select('*')

    if (error) {
      console.error("❌ Error de Supabase al leer sabio_palabras:", error)
      throw error
    }

    console.log("🧠 SABIO: Datos brutos recibidos de la BD:", todasLasPalabras)

    if (!todasLasPalabras || todasLasPalabras.length === 0) {
      console.warn("⚠️ SABIO: ¡La tabla 'sabio_palabras' está COMPLETAMENTE VACÍA en Supabase!")
      return
    }

    const columnaNombre = 'palabra' 
    
    const barajadas = todasLasPalabras
      .map(p => p[columnaNombre])
      .filter(Boolean)
      .sort(() => 0.5 - Math.random())
      
    if (barajadas.length === 0) {
      console.error(`❌ SABIO: Las filas existen pero la columna '${columnaNombre}' no existe o está vacía. Revisa tus columnas:`, todasLasPalabras[0])
      return
    }

    const tresPalabras = barajadas.slice(0, 3).join(', ')
    console.log("🧠 SABIO: Palabras elegidas con éxito:", tresPalabras)

    const { error: updateError } = await supabase
      .from('jugadores')
      .update({ meta_juego: tresPalabras })
      .eq('codigo_sala', props.codigoSala)
      .eq('nombre', props.nombreUsuario)

    if (updateError) {
      console.error("❌ Error al actualizar el jugador en Supabase:", updateError)
      throw updateError
    }

    miMetaJuegoLocal.value = tresPalabras

  } catch (err) {
    console.error("❌ Error crítico en inicializarPalabrasSabio:", err)
  }
} 

// --- ESTADO DEL LADRÓN ---
const robosContador = ref({}) 

const manejarRoboLadron = (nombreJugador) => {
  if (miRolLocal.value !== 'ladrón' && miRolLocal.value !== 'ladron') return
  
  if (robosContador.value[nombreJugador] === undefined) {
    robosContador.value[nombreJugador] = 0
  }
  
  robosContador.value[nombreJugador] += 1
}

const emit = defineEmits(['siguienteFrase', 'volverAlMenuPrincipal'])

// 💡 Sincronizadores automáticos de variables reactivas
watch(() => props.rolSecreto, async (nuevoRol) => {
  if (nuevoRol !== undefined) {
    miRolLocal.value = nuevoRol
    if (nuevoRol === 'sabio') {
      await inicializarPalabrasSabio()
    }
  }
}, { immediate: true })

watch(() => props.metaJuegoSecreto, (nuevoMeta) => {
  if (nuevoMeta !== undefined) miMetaJuegoLocal.value = nuevoMeta
}, { immediate: true, deep: true })

watch(() => props.listaJugadores, (nuevaLista) => {
  if (nuevaLista && nuevaLista.length > 0) {
    nuevaLista.forEach(j => {
      if (robosContador.value[j.nombre] === undefined) {
        robosContador.value[j.nombre] = 0
      }
    })
  }
}, { immediate: true, deep: true })

// --- ESTADOS DE VOTACIÓN LOCAL ---
const miVoto = ref(null) 
const voyAMentir = ref(false) 
const mentirasExitosas = ref([]) 

// --- ESTADO DEL SABIO ---
const palabrasMarcadas = ref({}) 

// --- ESTADOS DE LOS MODALES ---
const mostrandoModalAcusar = ref(false)
const mostrandoGuiaRoles = ref(false) 
const sospechosoSeleccionado = ref('')

// --- LÓGICA DE JUICIOS EN TIEMPO REAL ---
const juicioActivo = ref(null) 
const miVotoJuicio = ref(null) 
const acusacionFirmeHecha = ref(false)
const numeroRondaLocal = ref(1)

const listaVotos = ref([])

onMounted(async () => {
  escucharVotos()
  escucharMesaPartida()
  await recuperarEstadoJugador()
})

const recuperarEstadoJugador = async () => {
  try {
    if (!miRolLocal.value) {
      const { data: jugador } = await supabase
        .from('jugadores')
        .select('rol, meta_juego')
        .eq('codigo_sala', props.codigoSala)
        .eq('nombre', props.nombreUsuario)
        .maybeSingle()

      if (jugador) {
        miRolLocal.value = jugador.rol
        miMetaJuegoLocal.value = jugador.meta_juego
        
        if (jugador.rol === 'sabio') {
          await inicializarPalabrasSabio()
        }
      }
    }

    const { data: miVotoExistente } = await supabase
      .from('votos')
      .select('item_nombre')
      .eq('codigo_sala', props.codigoSala)
      .eq('jugador_nombre', props.nombreUsuario)
      .maybeSingle()

    if (miVotoExistente) {
      miVoto.value = miVotoExistente.item_nombre
    }
  } catch (err) {
    console.error("Error en la reconexión del jugador:", err)
  }
}

const escucharVotos = () => {
  const actualizarVotos = async () => {
    const { data } = await supabase
      .from('votos')
      .select('*')
      .eq('codigo_sala', props.codigoSala)
    
    listaVotos.value = data || []
  }

  actualizarVotos()

  const nombreCanalVotosUnico = `votos-${props.codigoSala}-${Date.now()}`

  miCanalVotos = supabase
    .channel(nombreCanalVotosUnico)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'votos', filter: `codigo_sala=eq.${props.codigoSala}` }, () => {
      actualizarVotos()
    })
    
  miCanalVotos.subscribe()
}

const escucharMesaPartida = () => {
  const actualizarMesaPartida = async () => {
    const { data } = await supabase
      .from('partidas')
      .select('juicio_activo, acusacion_firme_hecha, ronda_actual, estado')
      .eq('codigo_sala', props.codigoSala)
      .maybeSingle()

    if (data) {
      juicioActivo.value = data.juicio_activo
      acusacionFirmeHecha.value = data.acusacion_firme_hecha || false
      numeroRondaLocal.value = data.ronda_actual || 1
      
      if (data.estado === 'resumen') {
        partidaTerminadaAlcanzada.value = true
        congelarRolesFinales() // Sincroniza al entrar directo
      }
    }
  }

  actualizarMesaPartida()

  const nombreCanalUnico = `partida-${props.codigoSala}-${Date.now()}`

  miCanalPartida = supabase
    .channel(nombreCanalUnico)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'partidas', filter: `codigo_sala=eq.${props.codigoSala}` }, (payload) => {
      
      if (payload.new) {
        if (payload.new.estado === 'resumen') {
          partidaTerminadaAlcanzada.value = true
          congelarRolesFinales() // Sincroniza si cambia en tiempo real
          return
        }

        const nuevaRondaServidor = payload.new.ronda_actual || 1
        const haCambiadoDeRonda = nuevaRondaServidor !== numeroRondaLocal.value

        juicioActivo.value = payload.new.juicio_activo
        acusacionFirmeHecha.value = payload.new.acusacion_firme_hecha || false
        
        numeroRondaLocal.value = nuevaRondaServidor
        
        if (haCambiadoDeRonda) {
          prepararNuevaRondaLocal()
        }
      }
    })
    
  miCanalPartida.subscribe()
}

const prepararNuevaRondaLocal = () => {
  // ✨ CAMBIO CONCRETO: Si soy el mentiroso y tengo el modo activo, guardo la frase antes de limpiar
  const esMentiroso = miRolLocal.value?.toLowerCase() === 'mentiroso' || miRolLocal.value?.toLowerCase() === 'mentirosa'
  if (esMentiroso && voyAMentir.value && !acusacionFirmeHecha.value) {
    if (!mentirasExitosas.value.includes(props.fraseActiva)) {
      mentirasExitosas.value.push(props.fraseActiva)
      console.log("🤥 Mentira registrada automáticamente al cambiar de ronda:", props.fraseActiva)
    }
  }

  listaVotos.value = []
  miVoto.value = null
  voyAMentir.value = false
}

// --- PROPIEDADES COMPUTADAS ---
const listaSospechosos = computed(() => {
  return props.listaJugadores.filter(j => j.nombre !== props.nombreUsuario)
})

const totalVotosEmitidos = computed(() => listaVotos.value.length)

const todosHanVotado = computed(() => {
  return props.listaJugadores.length > 0 && totalVotosEmitidos.value >= props.listaJugadores.length
})

const obtenerEstadoVoto = (nombre) => {
  const voto = listaVotos.value.find(v => v.jugador_nombre === nombre)
  if (!voto) return { texto: 'Esperando', clase: 'voto-pendiente' }
  return voto.item_nombre === 'SI' 
    ? { texto: 'SÍ 🍻', clase: 'voto-si' } 
    : { texto: 'NO 🚫', clase: 'voto-no' }
}

const juradoRequerido = computed(() => {
  if (!juicioActivo.value) return []
  return props.listaJugadores.filter(j => j.nombre !== juicioActivo.value.acusador && j.nombre !== juicioActivo.value.sospechoso)
})

const totalVotosJuicioEmitidos = computed(() => {
  if (!juicioActivo.value || !juicioActivo.value.votos) return 0
  return Object.keys(juicioActivo.value.votos).length
})

const ejecutarRegresoAlMenu = () => {
  console.log("Despachando evento hacia el padre...");
  emit('volverAlMenuPrincipal')
}

// --- ACCIONES ---
const registrarVoto = async (opcion) => {
  miVoto.value = opcion
  try {
    const { data: existente } = await supabase
      .from('votos')
      .select('id')
      .eq('codigo_sala', props.codigoSala)
      .eq('jugador_nombre', props.nombreUsuario)
      .maybeSingle()

    if (existente) {
      await supabase.from('votos').update({ item_nombre: opcion }).eq('id', existente.id)
    } else {
      await supabase.from('votos').insert({
        codigo_sala: props.codigoSala,
        jugador_nombre: props.nombreUsuario,
        item_nombre: opcion
      })
    }
  } catch (err) {
    console.error("Error al votar:", err)
  }
}

const togglePalabraSabio = ({ palabra, estado }) => {
  palabrasMarcadas.value[palabra] = estado
}

const procesarSiguienteFrase = async () => {
  try {
    // 1️⃣ PRIMERO: Procesamos la mentira de la ronda que acaba de terminar
    const esMentiroso = miRolLocal.value === 'mentiroso' || miRolLocal.value === 'mentirosa'
    
    if (esMentiroso && voyAMentir.value && !acusacionFirmeHecha.value) {
      if (!mentirasExitosas.value.includes(props.fraseActiva)) {
        mentirasExitosas.value.push(props.fraseActiva)
        console.log("🤥 ¡Mentira colada y sumada con éxito!", props.fraseActiva)
        
        // 💡 NOTA: Si en tu código original aquí hacías un 'await supabase...' 
        // para guardar las mentiras en la BD de forma inmediata, vuélvelo a pegar aquí.
      }
    }

    // 2️⃣ SEGUNDO: ¿Era la última ronda?
    // (Recuerda cambiar este 3 por un 5 si la partida pasa a ser de 5 rondas)
    if (numeroRondaLocal.value >= 15) { 
      console.log("🏁 ¡Ronda final completada! Guardando estadísticas y yendo a resumen...")
      
      partidaTerminadaAlcanzada.value = true
      await congelarRolesFinales()

      try {
        await supabase
          .from('partidas')
          .update({ estado: 'resumen' })
          .eq('codigo_sala', props.codigoSala)
      } catch (err) {
        console.error("Error al pasar a resumen:", err)
      }
      return // Cortamos aquí porque la partida ha terminado
    }

    // 3️⃣ TERCERO: Si NO era la última ronda, avanzamos al siguiente turno de forma normal
    await supabase.from('votos').delete().eq('codigo_sala', props.codigoSala)
    prepararNuevaRondaLocal()

    const proximaRonda = numeroRondaLocal.value + 1
    numeroRondaLocal.value = proximaRonda

    await supabase
      .from('partidas')
      .update({ ronda_actual: proximaRonda })
      .eq('codigo_sala', props.codigoSala)

    console.log(`🚀 Siguiente ronda subida a Supabase de forma exitosa: ${proximaRonda}`)
    emit('siguienteFrase')

  } catch (err) {
    console.error("Error al gestionar el cambio de ronda:", err)
  }
}

const proponerJuicio = async () => {
  if (!sospechosoSeleccionado.value || acusacionFirmeHecha.value) return
  
  const nuevoJuicio = {
    acusador: props.nombreUsuario,
    sospechoso: sospechosoSeleccionado.value,
    votos: {}
  }

  await supabase
    .from('partidas')
    .update({ juicio_activo: nuevoJuicio })
    .eq('codigo_sala', props.codigoSala)

  mostrandoModalAcusar.value = false
  sospechosoSeleccionado.value = ''
}

// ✨ ENHANCED: Ahora sube tus datos locales empaquetados y se descarga los del resto
const congelarRolesFinales = async () => {
  try {
    let contenidoMeta = null
    const r = miRolLocal.value?.toLowerCase()

    if (r === 'mentiroso' || r === 'mentirosa') {
      // ✨ CAMBIO CONCRETO: Aseguramos capturar la frase de la última ronda o de un juicio repentino
      if (voyAMentir.value && !mentirasExitosas.value.includes(props.fraseActiva)) {
        mentirasExitosas.value.push(props.fraseActiva)
      }
      contenidoMeta = JSON.stringify({ tipo: 'mentiroso', datos: mentirasExitosas.value })
    } else if (r === 'ladrón' || r === 'ladron') {
      contenidoMeta = JSON.stringify({ tipo: 'ladron', datos: robosContador.value })
    } else if (r === 'sabio' || r === 'sabia') {
      contenidoMeta = JSON.stringify({ tipo: 'sabio', palabrasOriginales: miMetaJuegoLocal.value, datos: palabrasMarcadas.value })
    }

    if (contenidoMeta) {
      await supabase
        .from('jugadores')
        .update({ meta_juego: contenidoMeta })
        .eq('codigo_sala', props.codigoSala)
        .eq('nombre', props.nombreUsuario)
    }

    // Delay de sincronización para esperar cargas simultáneas
    await new Promise(resolve => setTimeout(resolve, 600))

    const { data, error } = await supabase
      .from('jugadores')
      .select('id, nombre, rol, meta_juego')
      .eq('codigo_sala', props.codigoSala)

    if (error) throw error
    if (data) {
      rolesFinales.value = data
      console.log("📸 Roles y estadísticas globales capturadas:", rolesFinales.value)
    }
  } catch (err) {
    console.error("Error al capturar los roles finales:", err)
  }
}

const enviarVotoJuicio = async (veredicto) => {
  if (!juicioActivo.value) return
  miVotoJuicio.value = veredicto

  const juicioActualizado = { ...juicioActivo.value }
  if (!juicioActualizado.votos) juicioActualizado.votos = {}
  juicioActualizado.votos[props.nombreUsuario] = veredicto

  if (Object.keys(juicioActualizado.votos).length < juradoRequerido.value.length) {
    await supabase
      .from('partidas')
      .update({ juicio_activo: juicioActualizado })
      .eq('codigo_sala', props.codigoSala)
    return
  }

  let sis = 0
  let nos = 0
  Object.values(juicioActualizado.votos).forEach(v => v === 'SI' ? sis++ : nos++)
  
  await congelarRolesFinales()  

  const esFirme = true 

  if (sis > nos) {
    const { data: jugadorAsesinado } = await supabase
      .from('jugadores')
      .select('rol')
      .eq('codigo_sala', props.codigoSala)
      .eq('nombre', juicioActualizado.sospechoso)
      .single()

    if (jugadorAsesinado && jugadorAsesinado.rol === 'mentiroso') {
      alert(`🎉 ¡SÍ POR MAYORÍA! Acusación aceptada. ¡Y HAN CAZADO AL MENTIROSO! Victoria absoluta para los inocentes.`)
    } else {
      alert(`💥 ¡SÍ POR MAYORÍA! Acusación aprobada pero... ¡ERA INOCENTE! (Rol: ${jugadorAsesinado?.rol || 'inocente'}). Se cierran las acusaciones por esta partida.`)
    }
  } else {
    alert(`😇 JUICIO RECHAZADO: El grupo desestima los cargos contra ${juicioActualizado.sospechoso}. Se cierran las acusaciones por esta partida.`)
  }

  prepararNuevaRondaLocal()
  
  const proximaRonda = numeroRondaLocal.value + 1
  
  numeroRondaLocal.value = proximaRonda
  juicioActivo.value = null
  acusacionFirmeHecha.value = true 

  await supabase.from('votos').delete().eq('codigo_sala', props.codigoSala)

  await supabase
    .from('partidas')
    .update({ 
      juicio_activo: null, 
      acusacion_firme_hecha: esFirme, 
      ronda_actual: proximaRonda
    })
    .eq('codigo_sala', props.codigoSala)
}

// ✨ HELPER DE SEGURIDAD: Supabase a veces devuelve objeto directo y otras string. Esto evita fallos de parseo.
const extraerDatosMeta = (jugador, tipoEsperado) => {
  if (!jugador || !jugador.meta_juego) return null
  let meta = jugador.meta_juego
  if (typeof meta === 'string') {
    try { meta = JSON.parse(meta) } catch (e) { return null }
  }
  return meta?.tipo === tipoEsperado ? meta.datos : null
}

// --- 📊 DESEMPAQUETADORES GLOBALES PARA LA PANTALLA DE RESUMEN ---

const mentirasGlobales = computed(() => {
  // 1. Intentar buscar en los datos sincronizados de la partida
  const fuente = props.listaJugadores.length > 0 ? props.listaJugadores : rolesFinales.value
  const jugador = fuente.find(j => j.rol?.toLowerCase() === 'mentiroso' || j.rol?.toLowerCase() === 'mentirosa')
  const datosDB = extraerDatosMeta(jugador, 'mentiroso')
  if (datosDB) return datosDB

  // 2. Fallback local por si la base de datos tarda milisegundos en replicar
  const soyMentiroso = miRolLocal.value?.toLowerCase() === 'mentiroso' || miRolLocal.value?.toLowerCase() === 'mentirosa'
  return soyMentiroso ? mentirasExitosas.value : []
})

const palabrasSabioGlobales = computed(() => {
  const fuente = props.listaJugadores.length > 0 ? props.listaJugadores : rolesFinales.value
  const jugador = fuente.find(j => j.rol?.toLowerCase() === 'sabio' || j.rol?.toLowerCase() === 'sabia')
  const datosDB = extraerDatosMeta(jugador, 'sabio')

  let mapaPalabras = {}
  if (datosDB) {
    mapaPalabras = datosDB
  } else {
    const soySabio = miRolLocal.value?.toLowerCase() === 'sabio' || miRolLocal.value?.toLowerCase() === 'sabia'
    if (soySabio) mapaPalabras = palabrasMarcadas.value
  }

  // ✨ CAMBIO CONCRETO: Transformamos el objeto en un array de objetos [{ palabra: 'X', estado: 'colada' }]
  // Esto mapea directamente los estados del Sabio y te facilita recorrerlos en el HTML template.
  return Object.entries(mapaPalabras).map(([palabra, estado]) => {
    let estadoLimpio = 'no intentada'
    if (estado === 'colada' || estado === 'pillada') {
      estadoLimpio = estado
    }
    return {
      palabra,
      estado: estadoLimpio
    }
  })
})

const robosGlobales = computed(() => {
  const fuente = props.listaJugadores.length > 0 ? props.listaJugadores : rolesFinales.value
  const jugador = fuente.find(j => j.rol?.toLowerCase() === 'ladrón' || j.rol?.toLowerCase() === 'ladron')
  const datosDB = extraerDatosMeta(jugador, 'ladron')
  if (datosDB) return datosDB

  const soyLadron = miRolLocal.value?.toLowerCase() === 'ladrón' || miRolLocal.value?.toLowerCase() === 'ladron'
  return soyLadron ? robosContador.value : {}
})

// --- 🧹 LIMPIEZA TOTAL AL SALIR ---
onUnmounted(() => {
  if (miCanalPartida) {
    supabase.removeChannel(miCanalPartida)
  }
  if (miCanalVotos) {
    supabase.removeChannel(miCanalVotos)
  }
})
</script>
<template>

<PantallaResumen 
  v-if="partidaTerminadaAlcanzada"
  :listaJugadores="rolesFinales.length > 0 ? rolesFinales : listaJugadores"
  :acusacionFirmeHecha="acusacionFirmeHecha"
  :mentirasMentiroso="mentirasGlobales"
  :palabrasSabioMarcadas="palabrasSabioGlobales"
  :robosDelLadron="robosGlobales"
  @volverAlMenu="ejecutarRegresoAlMenu"
/>

  <main v-else class="contenedor-juego-real">
    <header class="header-juego">
      <span>Sala: <strong class="codigo-sala-txt">{{ codigoSala }}</strong></span>
      
      <!-- 🕒 Cambiamos el texto de / 20 a / 3 -->
      <div class="contador-rondas-badge">
        Ronda: <strong>{{ numeroRondaLocal }} / 15</strong>
      </div>

      <button @click="mostrandoGuiaRoles = true" class="btn-ayuda-roles">ℹ️ Guía</button>
      <span>Jugador: <strong>{{ nombreUsuario }}</strong></span>
    </header>

    <div class="tablero-principal">
      <div class="tarjeta-rol" :class="'rol-' + miRolLocal">
        <p class="etiqueta-rol">Tu Identidad Oculta:</p>
        <h3 class="valor-rol">{{ miRolLocal ? miRolLocal.toUpperCase() : 'CARGANDO...' }}</h3>
        
        <PanelSabio 
          v-if="miRolLocal === 'sabio'"
          :rolSecreto="miRolLocal"
          :metaJuegoSecreto="miMetaJuegoLocal" 
          :palabrasMarcadas="palabrasMarcadas"
          @actualizarPalabra="togglePalabraSabio"
        />

        <PanelMentiroso 
          v-if="miRolLocal === 'mentiroso'"
          v-model:voyAMentir="voyAMentir"
          :mentirasExitosas="mentirasExitosas"
          :deshabilitado="acusacionFirmeHecha"
        />
      </div>
      <div v-if="palabrasSabioGlobales.length > 0">
  <h3>Palabras del Sabio:</h3>
  <ul>
    <li v-for="item in palabrasSabioGlobales" :key="item.palabra">
      <strong>{{ item.palabra }}</strong>: 
      <span :class="item.estado">{{ item.estado }}</span>
    </li>
  </ul>
</div>

      <div class="bloque-frase">
        <p class="frase-titulo">Yo Nunca...</p>
        <h2 class="frase-texto">{{ fraseActiva }}</h2>
      </div>

      <div class="zona-controles-votos">
        <div class="botones-voto-bloque">
          <button @click="registrarVoto('SI')" class="btn-voto btn-si" :class="{ 'voto-seleccionado-si': miVoto === 'SI' }">
            SÍ, bebes
          </button>
          <button @click="registrarVoto('NO')" class="btn-voto btn-no" :class="{ 'voto-seleccionado-no': miVoto === 'NO' }">
            NO, nunca
          </button>
        </div>

        <div class="acciones-partida-grupo">
          <button 
            @click="mostrandoModalAcusar = true" 
            class="btn-acusar" 
            :disabled="!!juicioActivo || acusacionFirmeHecha"
            :class="{ 'btn-deshabilitado': !!juicioActivo || acusacionFirmeHecha }"
          >
            {{ acusacionFirmeHecha ? '🔒 Acusación Usada' : '🚨 Proponer Juicio' }}
          </button>
          
          <button 
            @click="procesarSiguienteFrase" 
            class="btn-siguiente"
            :disabled="!todosHanVotado || !!juicioActivo"
            :class="{ 'btn-deshabilitado': !todosHanVotado || !!juicioActivo }"
          >
            {{ todosHanVotado ? 'Siguiente Frase ⚡' : ` (${totalVotosEmitidos}/${listaJugadores.length}) Votos` }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="juicioActivo" class="modal-overlay z-index-top">
      <div class="modal-contenido juicio-box">
        <h2 class="juicio-titulo">⚖️ TRIBUNAL POPULAR ⚖️</h2>
        <p class="juicio-descripcion">
          <strong>{{ juicioActivo.acusador }}</strong> afirma con rotundidad que <br>
          <span class="acusado-destacado">🎯 {{ juicioActivo.sospechoso }}</span> está mintiendo como un bellaco.
        </p>

        <div v-if="nombreUsuario !== juicioActivo.acusador && nombreUsuario !== juicioActivo.sospechoso">
          <p class="pregunta-voto">¿Estás de acuerdo con la acusación?</p>
          <div class="modal-botones">
            <button @click="enviarVotoJuicio('SI')" class="btn-voto-juicio btn-si-juicio" :disabled="miVotoJuicio !== null">
               SÍ, es culpable
            </button>
            <button @click="enviarVotoJuicio('NO')" class="btn-voto-juicio btn-no-juicio" :disabled="miVotoJuicio !== null">
               NO, es inocente
            </button>
          </div>
          <p class="contador-juicio-txt">Esperando votos del jurado: {{ totalVotosJuicioEmitidos }} / {{ juradoRequerido.length }}</p>
        </div>

        <div v-else>
          <p v-if="nombreUsuario === juicioActivo.acusador" class="espera-implicado">Estás liderando el juicio. Esperando deliberación de la mesa...</p>
          <p v-else class="espera-implicado 👀">¡Te están juzgando! Defiéndete verbalmente mientras el resto vota...</p>
          <p class="contador-juicio-txt">Votos recopilados: {{ totalVotosJuicioEmitidos }} / {{ juradoRequerido.length }}</p>
        </div>
      </div>
    </div>

    <footer class="monitor-jugadores">
      <p class="titulo-monitor">
        Estado de la mesa: 
        <span v-if="miRolLocal === 'ladrón' || miRolLocal === 'ladron'" style="color: #ffaa00; font-size: 0.9em; display: inline;">
          (🥷 Pulsa sobre un nombre para anotarle un robo)
        </span>
      </p>
      
      <div class="lista-tags">
        <div 
          v-for="jugador in listaJugadores" 
          :key="jugador.id" 
          class="tag-jugador-voto" 
          :class="obtenerEstadoVoto(jugador.nombre).clase"
          @click="manejarRoboLadron(jugador.nombre)"
          :style="(miRolLocal === 'ladrón' || miRolLocal === 'ladron') ? 'cursor: pointer; user-select: none;' : ''"
        >
          <span class="nombre-lbl">
            {{ jugador.nombre }}
            <strong 
              v-if="(miRolLocal === 'ladrón' || miRolLocal === 'ladron') && robosContador[jugador.nombre] > 0" 
              style="background: #ffaa00; color: #000; padding: 2px 6px; border-radius: 4px; margin-left: 5px; font-size: 0.8em;"
            >
              🎁 x{{ robosContador[jugador.nombre] }}
            </strong>
          </span>
          <span class="voto-badge">{{ obtenerEstadoVoto(jugador.nombre).texto }}</span>
        </div>
      </div>
    </footer>

    <div v-if="mostrandoModalAcusar" class="modal-overlay">
      <div class="modal-contenido">
        <h3>🚨 INICIAR JUICIO 🚨</h3>
        <p>¿De quién sospechas? Se abrirá una votación inmediata por mayoría.</p>
        <select v-model="sospechosoSeleccionado" class="select-acusar">
          <option value="" disabled>Selecciona al culpable...</option>
          <option v-for="j in listaSospechosos" :key="j.id" :value="j.nombre">
            {{ j.nombre }}
          </option>
        </select>
        <div class="modal-botones">
          <button @click="proponerJuicio" :disabled="!sospechosoSeleccionado" class="btn-confirmar-acusacion">
            Lanzar a Votación 🔥
          </button>
          <button @click="mostrandoModalAcusar = false" class="btn-cancelar">Cancelar</button>
        </div>
      </div>
    </div>

    <InfoRolesModal :mostrar="mostrandoGuiaRoles" @cerrar="mostrandoGuiaRoles = false" />
  </main>
</template>

<style scoped>
/* [Se mantienen todos los estilos anteriores e inyectamos los nuevos del tribunal] */
.contenedor-juego-real { min-height: 100vh; background-color: #121416; display: flex; flex-direction: column; color: #fff; font-family: 'Inter', sans-serif; }
.header-juego { display: flex; justify-content: space-between; align-items: center; padding: 15px 25px; background: #ffffff; border-bottom: 2px solid #e2e8f0; font-weight: 700; color: #000; }
.codigo-sala-txt { color: #dc2626; font-family: monospace; font-size: 1.1rem; }
.btn-ayuda-roles { background: #1e2937; color: #fbbf24; border: 1px solid #d1d5db; padding: 6px 14px; border-radius: 8px; font-weight: 800; cursor: pointer; }
.tablero-principal { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 30px 20px; gap: 35px; }
.tarjeta-rol { background: #1e222b; padding: 22px; border-radius: 20px; text-align: center; border: 2px dashed #4b5563; max-width: 450px; width: 100%; box-shadow: 0 10px 25px rgba(0,0,0,0.4); }
.rol-mentiroso { border-color: #ef4444; background: linear-gradient(135deg, #1e1b1b 0%, #2d1a1a 100%); }
.rol-sabio { border-color: #10b981; background: linear-gradient(135deg, #16221f 0%, #112920 100%); }
.rol-ladron { border-color: #f59e0b; background: linear-gradient(135deg, #24211a 0%, #2d2515 100%); }
.etiqueta-rol { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 2px; color: #9ca3af; margin: 0; }
.valor-rol { font-size: 2rem; font-weight: 900; margin: 5px 0 15px 0; letter-spacing: 1px; color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
.instruccion-rol { font-size: 0.85rem; color: #d1d5db; margin-bottom: 12px; font-weight: 500; }
.palabras-sabio-container { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
.palabra-sabio-tag { background: #2a3331; padding: 6px 12px; border-radius: 8px; font-size: 0.9rem; font-weight: 700; cursor: pointer; border: 1px solid #059669; transition: all 0.2s; }
.palabra-completada { background: #10b981 !important; color: #000 !important; text-decoration: line-through; border-color: #fff; }
.bloque-frase { text-align: center; max-width: 700px; padding: 0 10px; }
.frase-titulo { font-size: 1.4rem; font-weight: 900; color: #f59e0b; text-transform: uppercase; margin: 0; letter-spacing: 1px; }
.frase-texto { font-size: 2.5rem; font-weight: 900; margin: 12px 0 0 0; line-height: 1.25; color: #ffffff; }
.zona-controles-votos { display: flex; flex-direction: column; gap: 15px; width: 100%; max-width: 500px; }
.botones-voto-bloque { display: flex; gap: 15px; }
.btn-voto { flex: 1; height: 60px; border-radius: 14px; border: none; font-size: 1.05rem; font-weight: 900; cursor: pointer; transition: all 0.2s; color: #fff; }
.btn-si { background: #1e293b; border: 2px solid #3b82f6; }
.btn-no { background: #1e293b; border: 2px solid #6b7280; }
.voto-seleccionado-si { background: #3b82f6 !important; transform: scale(0.97); box-shadow: 0 0 15px rgba(59,130,246,0.5); }
.voto-seleccionado-no { background: #4b5563 !important; transform: scale(0.97); box-shadow: 0 0 15px rgba(107,114,128,0.5); }
.acciones-partida-grupo { display: flex; gap: 15px; margin-top: 10px; }
.btn-siguiente { flex: 1.3; background: #ffffff; color: #000; border: none; padding: 14px; font-size: 1rem; font-weight: 900; border-radius: 12px; cursor: pointer; text-transform: uppercase; }
.btn-deshabilitado { background: #1e2937 !important; color: #6b7280 !important; cursor: not-allowed !important; border: 1px solid #374151 !important; }
.btn-acusar { flex: 1; background: #dc2626; color: #fff; border: none; padding: 14px; font-size: 1rem; font-weight: 900; border-radius: 12px; cursor: pointer; text-transform: uppercase; }
.monitor-jugadores { background: #0b0c0e; padding: 20px; border-top: 2px solid #1f2937; }
.titulo-monitor { font-size: 0.85rem; font-weight: 800; color: #4b5563; text-transform: uppercase; margin: 0 0 12px 0; letter-spacing: 1px; }
.lista-tags { display: flex; flex-wrap: wrap; gap: 12px; }
.tag-jugador-voto { display: flex; align-items: center; justify-content: space-between; background: #1e222b; padding: 8px 14px; border-radius: 12px; min-width: 130px; font-weight: 700; font-size: 0.9rem; border: 1px solid #374151; }
.nombre-lbl { color: #f3f4f6; margin-right: 10px; }
.voto-badge { font-size: 0.8rem; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 6px; }
.voto-pendiente { border-left: 5px solid #6b7280; }
.voto-si { border-left: 5px solid #10b981; background: #112920 !important; }
.voto-no { border-left: 5px solid #ef4444; background: #2d1a1a !important; }
.modal-overlay { position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.85); display:flex; justify-content:center; align-items:center; z-index: 999; padding: 20px; }
.z-index-top { z-index: 2000 !important; }
.modal-contenido { background: #ffffff; color: #000; padding: 35px; border-radius: 24px; max-width: 450px; width: 100%; text-align: center; box-shadow: 0 25px 50px rgba(0,0,0,0.5); }
.modal-contenido h3 { margin: 0 0 10px 0; font-size: 1.6rem; font-weight: 900; color: #dc2626; }
.modal-contenido p { color: #4b5563; font-weight: 600; font-size: 0.95rem; margin-bottom: 20px; }
.select-acusar { width: 100%; height: 48px; border-radius: 10px; padding: 0 10px; font-size: 1rem; font-weight: 700; border: 2px solid #d1d5db; margin-bottom: 25px; background: #f9fafb; }
.modal-botones { display: flex; gap: 10px; }
.btn-confirmar-acusacion { flex: 1; background: #dc2626; color: #fff; border: none; padding: 12px; font-weight: 800; border-radius: 10px; cursor: pointer; text-transform: uppercase; }
.btn-cancelar { background: #e5e7eb; color: #4b5563; border: none; padding: 12px 20px; font-weight: 700; border-radius: 10px; cursor: pointer; }
.contador-rondas-badge {
  background: rgba(255, 255, 255, 0.08);
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  font-size: 0.95rem;
  letter-spacing: 0.5px;
  color: #e5e7eb;
}

.contador-rondas-badge strong {
  color: #ffaa00; /* Color dorado para resaltar el número */
  font-size: 1.05rem;
}
/* ESTILOS NUEVOS JUICIO BOX */
.juicio-box { background: #1e1b24 !important; border: 3px solid #8b5cf6; color: #fff !important; }
.juicio-titulo { color: #a78bfa !important; font-size: 1.5rem; font-weight: 900; margin: 0 0 15px 0; letter-spacing: 1px; }
.juicio-descripcion { color: #e9d5ff !important; font-size: 1.05rem; line-height: 1.4; }
.acusado-destacado { display: inline-block; background: #dc2626; padding: 4px 12px; border-radius: 8px; font-weight: 800; margin-top: 5px; color: #fff; }
.pregunta-voto { font-size: 1rem; font-weight: 800; color: #fbbf24; margin: 20px 0 10px 0; }
.btn-voto-juicio { flex: 1; padding: 14px; border-radius: 12px; border: none; font-weight: 800; font-size: 0.95rem; cursor: pointer; color: #fff; transition: all 0.2s; }
.btn-si-juicio { background: #10b981; }
.btn-si-juicio:hover { background: #059669; }
.btn-no-juicio { background: #ef4444; }
.btn-no-juicio:hover { background: #dc2626; }
.contador-juicio-txt { font-size: 0.8rem; color: #a78bfa; margin-top: 15px; font-weight: 600; }
.espera-implicado { font-style: italic; color: #cbd5e1; background: rgba(255,255,255,0.05); padding: 15px; border-radius: 10px; border: 1px dashed #4c1d95; margin-top: 15px; }
</style>