<template>
  <div class="capa-juego-total">
    <div class="tarjeta-juego">
      
      <div class="header-juego">
        <h1 class="titulo-dinamico">{{ nombreTematicaLocal }}</h1>  
        <p class="sala-sub">SALA: <strong>{{ codigoSala }}</strong></p>
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
        <button 
          @click="$emit('votar', 'si')" 
          :disabled="yaVotado" 
          class="btn-voto btn-si"
        >SÍ</button>
        <button 
          @click="$emit('votar', 'no')" 
          :disabled="yaVotado" 
          class="btn-voto btn-no"
        >NO</button>
      </div>

      <div class="monitor-votos">
        <p class="txt-quien">¿Quién falta?</p>
        <div class="lista-tags">
          <div 
            v-for="jugador in listaJugadores" 
            :key="jugador" 
            :class="['tag-pro', { 'voto-listo': hanVotado.includes(jugador) }]"
          >
            {{ jugador }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  ele_actual: String,
  nombreTematicaLocal: String,
  codigoSala: String,
  votosRecibidos: Number,
  totalJugadores: Number,
  carton: Array,
  yaVotado: Boolean,
  listaJugadores: Array,
  hanVotado: Array
})

defineEmits(['votar'])
</script>

<style scoped>
/* Pegamos aquí los estilos específicos del tablero que definimos antes */
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
</style>