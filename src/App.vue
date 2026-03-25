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
<div v-if="estado === 'cargando'" class="pantalla-centrada">
  <div class="login-card card-carga">
    <div class="loader"></div>
    <h2 class="titulo-drinkgo-mini">DRINKGO</h2>
    <p class="subtexto-carga">Preparando la ronda...</p>
    <div class="barra-progreso">
      <div class="progreso-infinito"></div>
    </div>
  </div>
    </div> <div v-else-if="estado === 'registro'" class="pantalla-centrada">
      <div class="login-card">
        <div class="header-registro">
          <img src="/logo.jpg" alt="Logo" class="logo-registro" />
          <h1 class="titulo-drinkgo">DRINKGO</h1>
        </div>
        <p class="subtitulo-drinkgo">Ludopatía y alcoholismo</p>
        <input v-model="nombreUsuario" placeholder="Nombre" />
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
/* 1. FONDO MODERNO Y PROFESIONAL */
body {
  margin: 0;
  padding: 0;
  /* Degradado sutil para que no sea blanco soso */
  background: radial-gradient(circle at top right, #fdfdfd 0%, #e0e0e0 100%);
  min-height: 100vh;
}

.pantalla-centrada { 
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  background-color: #212529; /* Gris oscuro */
}

.login-card {
  width: 100%;
  max-width: 550px; /* Aumentado de 400px a 550px */
  padding: 60px;    /* Más aire interno para que todo crezca */
  background: #ffffff;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  gap: 30px;        /* Más separación entre elementos */
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
}

/* 3. CABECERA ALINEADA */
.header-registro {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
}

.logo-registro {
  width: 90px;
  height: auto;
  animation: aparecerLogo 0.8s ease-out;
}

.titulo-drinkgo {
  font-family: 'Inter', 'Impact', sans-serif;
  font-size: 5rem;
  font-weight: 900;
  letter-spacing: -2px;
  color: #000000;
  margin: 0;
}

.subtitulo-drinkgo {
  font-family: 'Inter', sans-serif;
  font-size: 1.2rem;
  font-weight: 800;
  color: #7f1d1d; /* Rojo vino oscuro para profesionalidad */
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 3px;
  margin-bottom: 20px;
}

/* 4. FORMULARIO UNIFICADO (Mismo alto y alineación) */
.login-card input, 
.login-card button {
  width: 100%;
  box-sizing: border-box; /* Crucial para que midan exactamente lo mismo */
  height: 55px; /* Altura fija para todos los elementos */
  padding: 0 20px;
  border-radius: 12px; /* Bordes ligeramente redondeados, más pro que 0 */
  font-size: 1rem;
  margin: 0;
}

.login-card input {
  border: 2px solid #e2e8f0;
  background: #f8fafc;
  font-weight: 600;
  transition: all 0.2s;
}

.login-card input:focus {
  outline: none;
  border-color: #000;
  background: #fff;
}

.login-card button {
  background: #000;
  color: #fff;
  border: none;
  font-weight: 900;
  text-transform: uppercase;
  cursor: pointer;
  transition: transform 0.1s, background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-card button:hover {
  background: #222;
}

.login-card button:active {
  transform: scale(0.97);
}

.login-card button:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
}

/* ANIMACIÓN */
@keyframes aparecerLogo {
  from { opacity: 0; transform: scale(0.8) translateY(-10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

/* RESPONSIVE */
@media (max-width: 480px) {
  .login-card { padding: 30px 20px; }
  .titulo-drinkgo { font-size: 2.2rem; }
}
/* Esto cambia el color del texto de ayuda en todos los navegadores */
input::placeholder {
  color: #495057; /* Gris oscuro */
  opacity: 1;     /* Necesario para Firefox */
}

/* Opcional: Si quieres que el borde del input sea más fino para que 
   el placeholder destaque, puedes añadir esto a tu clase .login-card input */
.login-card input {
  border: 1px solid #ced4da;
  color: #000000ff; /* Color del texto cuando el usuario ya está escribiendo */
}
/* --- NUEVOS ESTILOS PARA LA PANTALLA DE CARGA --- */

/* Forzamos el fondo gris oscuro en el contenedor principal */
.pantalla-centrada { 
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #212529 !important; /* Gris oscuro */
}

/* Tarjeta de carga inspirada en la de registro */
.card-carga {
  width: 100%;
  max-width: 450px; /* Un poco más estrecha que la de registro */
  padding: 50px;
  background: #ffffff;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0,0,0,0.4);
}

.titulo-drinkgo-mini {
  font-family: 'Inter', 'Impact', sans-serif;
  font-size: 2.5rem;
  font-weight: 900;
  color: #000;
  margin: 20px 0 5px 0;
  letter-spacing: -1px;
}

.subtexto-carga {
  font-family: 'Inter', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  color: #4b5563;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 20px;
}

/* El círculo que gira */
.loader {
  width: 60px;
  height: 60px;
  border: 6px solid #f3f4f6;
  border-top: 6px solid #000; /* Negro para combinar con tu logo */
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Barra de progreso inferior */
.barra-progreso {
  width: 100%;
  height: 4px;
  background: #f3f4f6;
  border-radius: 10px;
  overflow: hidden;
}

.progreso-infinito {
  width: 40%;
  height: 100%;
  background: #000;
  animation: cargaDeslizar 1.5s infinite linear;
}

/* ANIMACIONES */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes cargaDeslizar {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(250%); }
}
</style>