<template>
  <div class="capa-espera-total">
    <div class="tarjeta-blanca-centrada"> 
      <div class="info-espera">
        <h2 class="titulo-espera">Esperando jugadores...</h2>
        <div class="contador-jugadores">
          <span class="numero-jugadores">{{ totalJugadores }}</span>
          <p>conectados actualmente</p>
        </div>
      </div>
      
      <button @click="$emit('comenzar')" class="btn-comenzar-pro">
        ¡TODOS LISTOS!
      </button>
      
      <p class="sala-id">
        Código de sala: <strong>{{ codigoSala }}</strong>
      </p>
    </div>
  </div>
</template>

<script setup>
// Definimos lo que este componente necesita para pintar la interfaz
defineProps({
  totalJugadores: Number,
  codigoSala: String
})

// Definimos los eventos que este componente puede enviar al padre
defineEmits(['comenzar'])
</script>

<style scoped>
.capa-espera-total {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #212529;
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
</style>