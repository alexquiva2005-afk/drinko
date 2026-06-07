<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  rolSecreto: String,
  listaJugadores: { type: Array, default: () => [] },
  nombreUsuario: String
})

// 🥷 El contador vive aquí dentro, inmune a problemas del GameBoard
const cuentaRobosLocal = ref({})

const victimasDisponibles = computed(() => {
  return props.listaJugadores.filter(j => j.nombre !== props.nombreUsuario)
})

const ejecutarRobo = (nombreJugador, cantidad) => {
  if (cuentaRobosLocal.value[nombreJugador] === undefined) {
    cuentaRobosLocal.value[nombreJugador] = 0
  }
  const nuevoValor = cuentaRobosLocal.value[nombreJugador] + cantidad
  cuentaRobosLocal.value[nombreJugador] = nuevoValor < 0 ? 0 : nuevoValor
}
</script>

<template>
  <div v-if="rolSecreto === 'ladrón' || rolSecreto === 'ladron'" class="panel-ladron">
    <p class="instruccion-rol">🥷 <strong>Misión del Ladrón:</strong> Roba sorbos o pertenencias. ¡Pulsa en el nombre o usa los botones!</p>
    
    <div class="lista-victimas-ladron">
      <div v-for="j in victimasDisponibles" :key="j.id" class="fila-victima">
        
        <span 
          class="nombre-victima" 
          @click="ejecutarRobo(j.nombre, 1)"
          style="cursor: pointer; flex-grow: 1; user-select: none; display: block; padding: 5px 0;"
        >
          👤 {{ j.nombre }}
        </span>
        
        <div class="control-contador">
          <button @click.stop="ejecutarRobo(j.nombre, -1)" class="btn-contador menos">—</button>
          <span class="cifra-contador" :class="{ 'tiene-robos': (cuentaRobosLocal[j.nombre] || 0) > 0 }">
            {{ cuentaRobosLocal[j.nombre] || 0 }}
          </span>
          <button @click.stop="ejecutarRobo(j.nombre, 1)" class="btn-contador mas">+</button>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.panel-ladron {
  margin-top: 15px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  border: 1px dashed rgba(255, 255, 255, 0.2);
  text-align: center;
}

.instruccion-rol {
  font-size: 0.95rem;
  color: #e0e0e0;
  margin-bottom: 12px;
  text-align: center;
}

.lista-victimas-ladron {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fila-victima {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #1e1e1e;
  border-radius: 8px;
}

.nombre-victima {
  font-size: 1rem;
  color: #fff;
  font-weight: 500;
}

.control-contador {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-contador {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: #333;
  color: white;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.btn-contador:hover { background: #444; }
.menos:hover { background: #b71c1c; }
.mas:hover { background: #2e7d32; }

.cifra-contador {
  font-size: 1.1rem;
  font-weight: bold;
  color: #777;
  min-width: 20px;
  text-align: center;
}

.tiene-robos {
  color: #e040fb !important; /* Brilla en morado si ha robado */
  text-shadow: 0 0 8px rgba(224, 64, 251, 0.4);
}

.estado-ladron-activo {
  padding: 8px;
  background: #37474f;
  color: #b0bec5;
  border-radius: 6px;
  font-size: 0.9rem;
}

.estado-ladron-pillado {
  padding: 8px;
  background: #4a148c;
  color: #ea80fc;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: bold;
}
</style>