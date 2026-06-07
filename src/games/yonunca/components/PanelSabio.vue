<script setup>
import { computed } from 'vue'

const props = defineProps({
  rolSecreto: String,
  metaJuegoSecreto: [String, Object, Array],
  palabrasMarcadas: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['actualizarPalabra'])

const palabrasListadas = computed(() => {
  if (props.rolSecreto !== 'sabio' || !props.metaJuegoSecreto) return []
  
  if (typeof props.metaJuegoSecreto === 'string') {
    return props.metaJuegoSecreto.split(',').map(p => p.trim()).filter(Boolean)
  }
  return []
})

const obtenerEstiloPalabra = (palabra) => {
  const estado = props.palabrasMarcadas[palabra]
  if (estado === 'exito') return { background: '#2e7d32', color: '#ffffff', decoration: '🟢 ¡La has colado!' } // Verde
  if (estado === 'cazado') return { background: '#c62828', color: '#ffffff', decoration: '🔴 ¡Te han pillado!' } // Rojo
  return { background: '#222222', color: '#aaaaaa', decoration: '⚪ Pendiente' } // Gris neutro oscuro
}

const cambiarEstadoMecanica = (palabra) => {
  const estadoActual = props.palabrasMarcadas[palabra]
  let nuevoEstado = null // Gris por defecto
  
  if (!estadoActual) nuevoEstado = 'exito' // De Gris -> Verde
  else if (estadoActual === 'exito') nuevoEstado = 'cazado' // De Verde -> Rojo
  else nuevoEstado = null // De Rojo -> Gris (Reset)

  emit('actualizarPalabra', { palabra, estado: nuevoEstado })
}
</script>

<template>
  <div v-if="rolSecreto === 'sabio'" class="panel-sabio">
    <p class="instruccion-sabio">🧙‍♂️ <strong>Tus 3 Palabras Clave:</strong> Debes colarlas disimuladamente durante el juego. Haz clic para marcarlas:</p>
    
    <div class="grid-palabras-sabio">
      <div 
        v-for="palabra in palabrasListadas" 
        :key="palabra"
        class="tarjeta-palabra-clickable"
        :style="{ background: obtenerEstiloPalabra(palabra).background, color: obtenerEstiloPalabra(palabra).color }"
        @click="cambiarEstadoMecanica(palabra)"
      >
        <span class="palabra-txt">{{ palabra.toUpperCase() }}</span>
        <span class="badge-estado-sub">{{ obtenerEstiloPalabra(palabra).decoration }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel-sabio {
  margin-top: 15px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px dashed rgba(123, 31, 162, 0.4);
}

.instruccion-sabio {
  font-size: 0.95rem;
  color: #e0e0e0;
  margin-bottom: 12px;
  text-align: center;
}

.grid-palabras-sabio {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tarjeta-palabra-clickable {
  padding: 12px 16px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
}

.tarjeta-palabra-clickable:hover {
  filter: brightness(1.15);
}

.tarjeta-palabra-clickable:active {
  transform: scale(0.98);
}

.palabra-txt {
  font-size: 1.1rem;
  font-weight: bold;
  letter-spacing: 1px;
}

.badge-estado-sub {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 4px;
}
</style>