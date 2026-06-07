<script setup>
defineProps({
  mostrar: Boolean
})
const emit = defineEmits(['cerrar'])
</script>

<template>
  <div v-if="mostrar" class="modal-overlay" @click.self="emit('cerrar')">
    <div class="modal-card">
      <header class="modal-header">
        <h2>🎭 GUÍA DE ROLES SECRETOS</h2>
        <button class="btn-cerrar-aspa" @click="emit('cerrar')">×</button>
      </header>

      <div class="modal-cuerpo">
        <div class="rol-info-bloque info-mentiroso">
          <h3>🤫 EL MENTIROSO</h3>
          <p>Tienes que mentir en 5 ocasiones sin que te pillen. Todos tenéis una acusación por partida que se someterá a votación. Por cada mentira que cueles repartes 2 tragos, si te pillan, bebes 3 y no puedes mentir más.</p>
        </div>

        <div class="rol-info-bloque info-sabio">
          <h3>🧙‍♂️ EL SABIO</h3>
          <p>Tienes un vocabulario muy amplio.. quizás demasiado. Tienes que meter con naturalidad las 3 palabras en una conversación. Por cada una que cueles repartes 3 tragos y por cada una que te pillen bebes 3. Aunque te pillen una puedes intentarlo con las que te queden... aunque es más arriesgado. Aquí hay acusaciones infinitas, pero no abuséis.</p>
        </div>

        <div class="rol-info-bloque info-ladron">
          <h3>🥷 EL LADRÓN</h3>
          <p>Eres cléptomano, tienes que robar el máximo número de objetos posibles a los jugadores, toca su nombre y se registrará un robo. Por cada robo repartes 2 tragos, si te pillan robando bebes 3... cada vez que te pillen..</p>
        </div>
      </div>

      <footer class="modal-footer">
        <button class="btn-entendido" @click="emit('cerrar')">¡ENTENDIDO!</button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.85); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 20px; }
.modal-card { background: #1e222b; color: #fff; width: 100%; max-width: 500px; border-radius: 20px; border: 2px solid #374151; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; background: #111317; border-bottom: 1px solid #2d3139; }
.modal-header h2 { margin: 0; font-size: 1.2rem; font-weight: 900; color: #fbbf24; letter-spacing: 0.5px; }
.btn-cerrar-aspa { background: none; border: none; color: #9ca3af; font-size: 2rem; cursor: pointer; line-height: 1; }
.modal-cuerpo { padding: 20px; display: flex; flex-direction: column; gap: 15px; overflow-y: auto; max-height: 60vh; }
.rol-info-bloque { padding: 14px; border-radius: 12px; border-left: 5px solid #6b7280; background: #161920; }
.rol-info-bloque h3 { margin: 0 0 6px 0; font-size: 1rem; font-weight: 800; }
.rol-info-bloque p { margin: 0; font-size: 0.85rem; color: #9ca3af; line-height: 1.4; }
.info-mentiroso { border-left-color: #ef4444; }
.info-mentiroso h3 { color: #fca5a5; }
.info-sabio { border-left-color: #10b981; }
.info-sabio h3 { color: #a7f3d0; }
.info-ladron { border-left-color: #f59e0b; }
.info-ladron h3 { color: #fde68a; }
.modal-footer { padding: 15px 20px; background: #111317; display: flex; justify-content: flex-end; border-top: 1px solid #2d3139; }
.btn-entendido { background: #fff; color: #000; border: none; padding: 10px 24px; font-weight: 800; border-radius: 8px; cursor: pointer; font-size: 0.85rem; text-transform: uppercase; }
</style>