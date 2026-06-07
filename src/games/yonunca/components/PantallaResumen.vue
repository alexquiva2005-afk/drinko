<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  listaJugadores: { type: Array, default: () => [] },
  acusacionFirmeHecha: Boolean,
  mentirasMentiroso: { type: Array, default: () => [] },
  palabrasSabioMarcadas: { type: Object, default: () => ({}) }, 
  robosDelLadron: { type: Object, default: () => ({}) }        
})

// Mantenemos tu emit original intacto para que el botón funcione
const emit = defineEmits(['volverAlMenu'])

// 📸 VARIABLES LOCALES PARA CONGELAR LOS DATOS Y EVITAR QUE SE BORREN
const snapshotJugadores = ref([])
const snapshotMentiras = ref([])
const snapshotPalabrasSabio = ref({})
const snapshotRobos = ref({})
const snapshotAcusacion = ref(false)

// 1️⃣ Watch independiente para Jugadores
watch(() => props.listaJugadores, (nuevosJugadores) => {
  if (nuevosJugadores && nuevosJugadores.length > 0) {
    const tieneRolesActivos = nuevosJugadores.some(j => j.rol && j.rol !== 'sin_rol')
    if (tieneRolesActivos || snapshotJugadores.value.length === 0) {
      snapshotJugadores.value = JSON.parse(JSON.stringify(nuevosJugadores))
    }
  }
}, { immediate: true, deep: true })

// 2️⃣ Watch independiente para las Mentiras (solo congela si traen datos)
watch(() => props.mentirasMentiroso, (nuevasMentiras) => {
  if (nuevasMentiras && nuevasMentiras.length > 0) {
    snapshotMentiras.value = [...nuevasMentiras]
  }
}, { immediate: true, deep: true })

// 3️⃣ Watch independiente para las Palabras del Sabio (así no depende de los jugadores)
watch(() => props.palabrasSabioMarcadas, (nuevasPalabras) => {
  if (nuevasPalabras && Object.keys(nuevasPalabras).length > 0) {
    snapshotPalabrasSabio.value = { ...nuevasPalabras }
  }
}, { immediate: true, deep: true })

// 4️⃣ Watch independiente para los Robos del Ladrón
watch(() => props.robosDelLadron, (nuevosRobos) => {
  if (nuevosRobos && Object.keys(nuevosRobos).length > 0) {
    snapshotRobos.value = { ...nuevosRobos }
  }
}, { immediate: true, deep: true })

// 5️⃣ Watch para la Acusación
watch(() => props.acusacionFirmeHecha, (valor) => {
  snapshotAcusacion.value = valor
}, { immediate: true })


// 🕵️‍♂️ Buscamos los roles en nuestra foto fija
const datosMentiroso = computed(() => {
  return snapshotJugadores.value.find(j => {
    const r = j.rol?.toLowerCase()
    return r === 'mentiroso' || r === 'mentirosa'
  })
})

const datosSabio = computed(() => {
  return snapshotJugadores.value.find(j => {
    const r = j.rol?.toLowerCase()
    return r === 'sabio' || r === 'sabia'
  })
})

const datosLadron = computed(() => {
  return snapshotJugadores.value.find(j => {
    const r = j.rol?.toLowerCase()
    return r === 'ladrón' || r === 'ladron'
  })
})

// Mantenemos esta lógica viva para heredar las clases CSS de colores (.resumen-inocentes, etc.)
const veredictoFinal = computed(() => {
  if (!datosMentiroso.value) {
    return { clase: "resumen-practica" }
  }
  if (snapshotAcusacion.value) {
    return { clase: "resumen-inocentes" }
  } else {
    return { clase: "resumen-mentiroso" }
  }
})

// Contar palabras que están en 'true' (Verde)
const palabrasColadasSabio = computed(() => {
  return Object.entries(snapshotPalabrasSabio.value || {})
    .filter(([_, check]) => check === true)
    .map(([palabra]) => palabra)
})
</script>

<template>
  <div class="pantalla-resumen-layout">
    <div class="tarjeta-resumen-card" :class="veredictoFinal?.clase">
      
      <header class="resumen-header">
        <h2>🏁 Partida Finalizada</h2>
        <p class="subtitulo-veredicto">¡Gracias por jugar! Aquí tienes el resumen de la sesión.</p>
      </header>

      <hr class="divisor-resumen" />

      <div class="seccion-stats-roles">
        <h3>📊 RENDIMIENTO DE LOS ROLES</h3>
        
        <div v-if="!datosMentiroso && !datosLadron && !datosSabio" class="no-roles-aviso">
          <p>No se han registrado estadísticas porque ningún jugador tenía asignado un rol especial en esta sesión.</p>
        </div>

        <div v-if="datosMentiroso" class="stat-box-rol rol-mentiroso-stat">
          <h4>🤥 El Mentiroso: <span class="nombre-destacado">{{ datosMentiroso.nombre }}</span></h4>
          <p v-if="snapshotMentiras && snapshotMentiras.length > 0" class="stat-desc">
            Consiguió colar con éxito <strong>{{ snapshotMentiras.length }}</strong> mentiras sin ser descubierto:
          </p>
          <p v-else class="stat-desc">No llegó a colar ninguna mentira esta partida.</p>
          <ul class="lista-mentiras-coladas" v-if="snapshotMentiras && snapshotMentiras.length > 0">
            <li v-for="(frase, i) in snapshotMentiras" :key="i">» "{{ frase }}"</li>
          </ul>
        </div>

        <div v-if="datosLadron" class="stat-box-rol rol-ladron-stat">
          <h4>🥷 Informe del Ladrón: <span class="nombre-destacado">{{ datosLadron.nombre }}</span></h4>
          <p class="stat-desc">Historial de copas y objetos birlados a la mesa:</p>
          <div class="tabla-robos">
            <div v-for="jugador in snapshotJugadores" :key="jugador.id || jugador.nombre" class="fila-robo">
              <span>A {{ jugador.nombre }}:</span>
              <strong class="cantidad-robos">
                {{ snapshotRobos?.[jugador.nombre] ? `🎁 x${snapshotRobos[jugador.nombre]} robos` : '0 robos' }}
              </strong>
            </div>
          </div>
        </div>

        <div v-if="datosSabio" class="stat-box-rol rol-sabio-stat">
          <h4>🧠 Desafío del Sabio: <span class="nombre-destacado">{{ datosSabio.nombre }}</span></h4>
          <p class="stat-desc">Palabras clave que consiguió camuflar en los debates de la mesa:</p>
          <div v-if="palabrasColadasSabio && palabrasColadasSabio.length > 0" class="tags-palabras-sabio">
            <span v-for="(palabra, i) in palabrasColadasSabio" :key="i" class="tag-palabra-exito">
              ✅ {{ palabra }}
            </span>
          </div>
          <p v-else class="no-data-txt">No logró meter ninguna palabra secreta en las conversaciones.</p>
        </div>
      </div>

      <footer class="resumen-footer">
        <button @click="emit('volverAlMenu')" class="btn-volver-menu-principal">
          Volver al Menú Principal 🏠
        </button>
      </footer>

    </div>
  </div>
</template>

<style scoped>
.pantalla-resumen-layout {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  padding: 20px;
}

.tarjeta-resumen-card {
  background: #1a1a1a;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 30px;
  max-width: 600px;
  width: 100%;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}

.resumen-inocentes { border-color: #00cc66; box-shadow: 0 0 20px rgba(0, 204, 102, 0.2); }
.resumen-mentiroso { border-color: #ff3333; box-shadow: 0 0 20px rgba(255, 51, 51, 0.2); }
.resumen-practica { border-color: #718096; box-shadow: 0 0 15px rgba(255, 255, 255, 0.05); }

.resumen-header h2 {
  font-size: 1.8rem;
  margin: 0 0 8px 0;
  text-align: center;
}

.subtitulo-veredicto {
  color: #a0aec0;
  text-align: center;
  margin: 0;
  font-size: 1.1rem;
}

.divisor-resumen {
  border: 0;
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 25px 0;
}

.seccion-stats-roles h3 {
  font-size: 1.1rem;
  color: #ffaa00;
  letter-spacing: 1px;
  margin-bottom: 20px;
  text-align: center;
}

.no-roles-aviso {
  text-align: center;
  color: #a0aec0;
  font-size: 0.95rem;
  padding: 20px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
}

.stat-box-rol {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 15px;
}

.stat-box-rol h4 {
  margin: 0 0 10px 0;
  font-size: 1.1rem;
}

.nombre-destacado {
  color: #ffaa00;
  font-weight: bold;
}

.stat-desc {
  font-size: 0.9rem;
  color: #cbd5e0;
  margin: 0 0 12px 0;
}

.lista-mentiras-coladas {
  list-style: none;
  padding-left: 5px;
  margin: 5px 0 0 0;
}

.lista-mentiras-coladas li {
  font-style: italic;
  color: #a0aec0;
  font-size: 0.9rem;
  margin-bottom: 6px;
}

.tabla-robos {
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
}

.fila-robo {
  display: flex;
  justify-content: space-between;
  font-size: 0.95rem;
  color: #cbd5e0;
  padding: 4px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}

.fila-robo:last-child {
  border-bottom: none;
}

.cantidad-robos {
  color: #ffaa00;
}

.tags-palabras-sabio {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-palabra-exito {
  background: rgba(0, 204, 102, 0.15);
  border: 1px solid #00cc66;
  color: #00cc66;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.85rem;
}

.no-data-txt {
  font-size: 0.9rem;
  color: #718096;
  margin: 0;
}

.resumen-footer {
  margin-top: 30px;
  display: flex;
  justify-content: center;
}

.btn-volver-menu-principal {
  background: #ffaa00;
  color: #000;
  border: none;
  padding: 12px 30px;
  font-weight: bold;
  font-size: 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s;
}

.btn-volver-menu-principal:hover {
  transform: scale(1.03);
}
</style>