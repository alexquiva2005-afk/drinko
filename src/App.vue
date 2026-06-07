<template>
  <div class="portal-global">
    
    <div v-if="juegoSeleccionado === ''" class="menu-portal-container">
      <div class="background-overlay"></div>
      <div class="ambient-glow-1"></div>
      <div class="ambient-glow-2"></div>
      
      <header class="portal-header">
        <div class="logo-badge">
          <span class="pulse-dot"></span> NESUA GAMES PORTAL
        </div>
        <h1 class="portal-title">Elige tu juego</h1>
        <p class="portal-subtitle">¿Con qué juego bebemos hoy? </p>
      </header>

      <main class="games-grid">
        <div class="game-card" @click="juegoSeleccionado = 'bingo'">
          <div class="card-img-wrapper">
            <img src="/logodrinkgo.jpg" alt="Bingo de Copas" class="game-card-img" />
          </div>
          <div class="card-content">
            <h3>Bingo de Copas</h3>
            <p>Bingo con el que contar anéctodas, divertirte y sobre todo BEBER.</p>
            <div class="badge-ready">
              <span>ENTRAR AL JUEGO</span>
              <span class="arrow-icon">→</span>
            </div>
          </div>
        </div>

        <div class="game-card" @click="juegoSeleccionado = 'yonunca'">
          <div class="card-img-wrapper">
            <img src="/logoyonunca.png" alt="Yo Nunca con Roles" class="game-card-img" />
          </div>
          <div class="card-content">
            <h3>Yo Nunca con Roles</h3>
            <p>Un yo nunca de toda la vida... más o menos.</p>
            <div class="badge-ready">
              <span>ENTRAR AL JUEGO</span>
              <span class="arrow-icon">→</span>
            </div>
          </div>
        </div>
      </main>
    </div>

    <div v-else class="game-runtime-wrapper">
      <button class="btn-salir-al-portal" @click="volverAlPortal">
        <span class="back-arrow">←</span> Volver al Portal de Juegos
      </button>

      <PortadaBingo v-if="juegoSeleccionado === 'bingo'" />
      <PortadaYoNunca v-if="juegoSeleccionado === 'yonunca'" />
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import PortadaBingo from './games/bingo/PortadaBingo.vue' 
import PortadaYoNunca from './games/yonunca/PortadaYoNunca.vue'

const juegoSeleccionado = ref('') // Vacío = Menú principal del portal

const volverAlPortal = () => {
  if (confirm('¿Quieres salir al menú del portal? Se perderá el progreso que no esté guardado.')) {
    juegoSeleccionado.value = ''
  }
}
</script>

<style scoped>
/* --- 🎨 ESTILO NEÓN PREMIUM PARA EL PORTAL --- */
.portal-global {
  min-height: 100vh;
  background-color: #060913;
  color: #f8fafc;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  overflow-x: hidden;
  position: relative;
}

/* Capas de luces ambientales de fondo */
.background-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: radial-gradient(circle at 50% 30%, rgba(99, 102, 241, 0.12) 0%, transparent 70%);
  pointer-events: none;
  z-index: 1;
}

.ambient-glow-1 {
  position: absolute;
  top: -10%; left: -10%; width: 40vw; height: 40vw;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%);
  pointer-events: none;
  z-index: 1;
}

.ambient-glow-2 {
  position: absolute;
  bottom: -10%; right: -10%; width: 50vw; height: 50vw;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%);
  pointer-events: none;
  z-index: 1;
}

.menu-portal-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 120px 24px; /* ✨ Aumentado el margen superior e inferior de 80px a 120px */
  position: relative;
  z-index: 10;
}

.portal-header {
  margin-bottom: 70px; /* ✨ Más espacio entre el título y las tarjetas */
  text-align: center;
}

.logo-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.3);
  color: #a5b4fc;
  padding: 6px 16px;
  border-radius: 100px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

.pulse-dot {
  width: 6px;
  height: 6px;
  background-color: #6366f1;
  border-radius: 50%;
  box-shadow: 0 0 8px #6366f1;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(99, 102, 241, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
}

.portal-title {
  font-size: 3.2rem;
  font-weight: 900;
  margin: 24px 0 16px 0;
  letter-spacing: -1px;
  line-height: 1.3; /* ✨ CRUCIAL: Evita que el texto se corte por arriba/abajo */
  background: linear-gradient(135deg, #ffffff 30%, #cbd5e1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.portal-subtitle {
  color: #94a3b8;
  font-size: 1.1rem;
  max-width: 500px;
  margin: 0 auto;
}

/* --- 🎴 GRID DE JUEGOS --- */
.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 30px;
  margin-top: 20px;
}

.game-card {
  background: linear-gradient(145deg, #0f1524 0%, #131b2e 100%);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 24px;
  padding: 30px;
  text-align: left;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 20px;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 10px 30px -15px rgba(0, 0, 0, 0.5);
}

/* Brillo sutil e iluminación al pasar el ratón */
.game-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: radial-gradient(800px circle at var(--x, 0px) var(--y, 0px), rgba(255,255,255,0.06), transparent 40%);
  pointer-events: none;
}

.game-card:hover {
  transform: translateY(-6px);
  border-color: rgba(99, 102, 241, 0.4);
  box-shadow: 0 20px 40px -15px rgba(99, 102, 241, 0.15),
              0 0 30px -5px rgba(59, 130, 246, 0.1);
}

/* --- 🖼️ CONTENEDOR DE LOGO GENÉRICO --- */
.card-img-wrapper {
  width: 65px;
  height: 65px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: all 0.3s ease;
}

.game-card:hover .card-img-wrapper {
  background: rgba(99, 102, 241, 0.1);
  border-color: rgba(99, 102, 241, 0.3);
  transform: scale(1.05);
}

.game-card-img {
  width: 85%;
  height: 85%;
  object-fit: contain;
}

/* --- 📝 CONTENIDO DE LA TARJETA --- */
.card-content {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.card-content h3 {
  font-size: 1.4rem;
  font-weight: 800;
  margin: 0 0 10px 0;
  color: #f1f5f9;
  letter-spacing: -0.3px;
}

.card-content p {
  font-size: 0.95rem;
  color: #64748b;
  margin: 0 0 24px 0;
  line-height: 1.5;
  flex-grow: 1;
}

/* --- 🏷️ BOTÓN ACCIÓN INTERNO --- */
.badge-ready {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #3b82f6;
  font-weight: 700;
  font-size: 0.85rem;
  letter-spacing: 0.5px;
  margin-top: auto;
  transition: all 0.3s ease;
}

.arrow-icon {
  transition: transform 0.3s ease;
}

.game-card:hover .badge-ready {
  color: #818cf8;
}

.game-card:hover .arrow-icon {
  transform: translateX(4px);
}

/* --- 🚪 BOTÓN DE ESCAPE EN RUNTIME (GLASSMORPHISM) --- */
.btn-salir-al-portal {
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 99999;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  padding: 10px 18px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}

.btn-salir-al-portal:hover {
  background: #ef4444;
  border-color: #ef4444;
  color: white;
  transform: translateX(2px);
  box-shadow: 0 4px 25px rgba(239, 68, 68, 0.4);
}

.back-arrow {
  font-size: 1rem;
  line-height: 1;
}

.game-runtime-wrapper {
  position: relative;
  width: 100%;
  min-height: 100vh;
}
</style>