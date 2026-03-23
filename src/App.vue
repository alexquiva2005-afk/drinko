<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from './lib/supabaseClient'
import BingoCarton from './components/BingoCarton.vue'

const estado = ref('registro')
const nombreUsuario = ref('')
const codigoSala = ref('')
const tematicaId = ref(null)
const nombreTematica = ref(null) // Lo iniciamos en null

const entrarAPartida = async () => {
  if (!nombreUsuario.value || !codigoSala.value) return
  const salaLimpia = codigoSala.value.trim().toUpperCase()
  estado.value = 'cargando'

  try {
    // 1. Buscamos la partida y su temática
    let { data: partida } = await supabase
      .from('partidas')
      .select('*, tematicas(id, nombre)')
      .eq('codigo_sala', salaLimpia)
      .maybeSingle()

    // 2. Si no existe, la creamos (con temática aleatoria)
    if (!partida) {
      const { data: todas } = await supabase.from('tematicas').select('*')
      const temaAleatorio = todas[Math.floor(Math.random() * todas.length)]

      const { data: nueva, error: errCrea } = await supabase
        .from('partidas')
        .insert({ 
          codigo_sala: salaLimpia, 
          tematica_id: temaAleatorio.id,
          item_actual_nombre: 'START' 
        })
        .select('*, tematicas(id, nombre)')
        .single()

      if (errCrea) throw errCrea
      partida = nueva
    }

    // 3. Guardamos los datos necesarios
    tematicaId.value = partida.tematica_id
    nombreTematica.value = partida.tematicas?.nombre || 'Bingo'
    codigoSala.value = salaLimpia

    // 4. IMPORTANTE: Eliminamos el INSERT en la tabla 'jugadores'.
    // Ahora usaremos "Presence" en el componente hijo, que es automático al cerrar pestaña.
    
    estado.value = 'jugando'
  } catch (error) {
    console.error(error)
    alert("Error al conectar")
    estado.value = 'registro'
  }
}

onMounted(() => {
  estado.value = 'registro'
})
</script>

<template>
  <div id="app">
<div v-if="estado === 'cargando'" class="pantalla-centrada pantalla-carga">
  <div class="loader"></div>
  <h2 class="texto-carga">DRINKGO</h2>
  <p class="subtexto-carga">Preparando la ronda...</p>
</div>

    <div v-else-if="estado === 'registro'" class="pantalla-centrada">
      <div class="login-card">
        <h1 class="titulo-drinkgo">DRINKGO</h1>
        <p class="subtitulo-drinkgo">Ludopatía y alcoholismo</p>
        <input v-model="nombreUsuario" placeholder="Tu nombre" />
        <input v-model="codigoSala" placeholder="Código de sala" />
        <button @click="entrarAPartida" :disabled="!nombreUsuario || !codigoSala">
          Entrar a jugar
        </button>
      </div>
    </div>

    <main v-else>
      <header class="header-juego">
        <span>Sala: <strong>{{ codigoSala }}</strong></span>
        <span>Jugador: <strong>{{ nombreUsuario }}</strong></span>
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

<style>
/* 1. Reset del contenedor para que sea minimalista */
.pantalla-centrada { 
  border: none; /* Quitamos la línea de puntos */
  padding: 60px 20px; 
  text-align: center; 
  margin-top: 30px; 
  background: #ffffff; /* Blanco puro */
}

/* 2. Tipografía DRINKGO (Letras chulas y negras) */
.titulo-drinkgo {
  font-family: 'Inter', 'Impact', sans-serif;
  font-size: 4rem;
  font-weight: 900;
  letter-spacing: -3px; /* Efecto compacto moderno */
  margin-bottom: 0;
  color: #000000;
  text-transform: uppercase;
}

/* Subtítulo en negro, más bajo y con espaciado */
.subtitulo-drinkgo {
  font-family: 'Inter', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: #000000; /* Ahora es negro puro */
  margin-top: 10px; /* Bajado respecto al título */
  margin-bottom: 50px; /* Más espacio antes de los inputs */
  text-transform: uppercase;
  letter-spacing: 2px;
}

/* Optimización para móvil: quitamos márgenes excesivos */
.pantalla-centrada { 
  border: none;
  padding: 40px 15px; 
  text-align: center; 
  margin-top: 10vh; /* Se adapta a la altura de la pantalla */
  background: #ffffff;
}

/* 4. Inputs y Botón más "Pro" */
.login-card input { 
  width: 100%;
  max-width: 300px;
  border: 2px solid #000; /* Borde negro sólido */
  padding: 15px;
  border-radius: 0; /* Estilo cuadrado es más moderno ahora */
  font-weight: bold;
}

.login-card button {
  width: 100%;
  max-width: 300px;
  background: #000;
  color: #fff;
  padding: 18px;
  font-size: 1rem;
  font-weight: 900;
  text-transform: uppercase;
  border: none;
  cursor: pointer;
  transition: transform 0.1s;
}

.login-card button:active {
  transform: scale(0.98);
}
</style>