<script setup>
import { watch } from 'vue'

const props = defineProps({
  voyAMentir: Boolean,
  mentirasExitosas: {
    type: Array,
    default: () => []
  },
  deshabilitado: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:voyAMentir'])

// Si el mentiroso es cazado en mitad de la ronda, le apagamos el modo mentir inmediatamente
watch(() => props.deshabilitado, (estaCazado) => {
  if (estaCazado && props.voyAMentir) {
    emit('update:voyAMentir', false)
  }
})
</script>

<template>
  <div class="panel-mentiroso-interno">
    <div class="estrategia-bloque">
      <button 
        @click="!deshabilitado && emit('update:voyAMentir', !voyAMentir)" 
        class="btn-estrategia"
        :class="{ 'modo-mentir-activo': voyAMentir, 'btn-cazado-disabled': deshabilitado }"
        :disabled="deshabilitado"
      >
        {{ deshabilitado ? '🔒 PILLADO (SÓLO PUEDES DECIR LA VERDAD)' : voyAMentir ? '⚠️ MODO: VOY A MENTIR' : '😇 MODO: DIRÉ LA VERDAD' }}
      </button>
    </div>

    <p class="instruccion-rol">Historial de engaños exitosos ({{ mentirasExitosas.length }}/5):</p>
    <div class="slots-mentiras">
      <div 
        v-for="index in 5" 
        :key="index" 
        class="slot-item"
        :class="{ 'slot-ocupado': mentirasExitosas[index - 1] }"
        :title="mentirasExitosas[index - 1] || 'Hueco libre'"
      >
        {{ mentirasExitosas[index - 1] ? '🤫' : '?' }}
      </div>
    </div>

    <div v-if="mentirasExitosas.length > 0" class="lista-mentiras-texto">
      <p v-for="(m, i) in mentirasExitosas" :key="i" class="frase-colada">
        ❌ {{ m }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.panel-mentiroso-interno { width: 100%; display: flex; flex-direction: column; gap: 12px; }
.instruccion-rol { font-size: 0.85rem; color: #d1d5db; margin: 5px 0; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
.estrategia-bloque { width: 100%; margin-bottom: 5px; }
.btn-estrategia { width: 100%; padding: 12px; border-radius: 10px; border: 2px solid #451a1a; background: #221515; color: #fca5a5; font-weight: 800; cursor: pointer; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; transition: all 0.2s; }
.modo-mentir-activo { background: #ef4444 !important; border-color: #fff !important; color: #fff !important; box-shadow: 0 0 10px rgba(239, 68, 68, 0.4); }
.btn-cazado-disabled { background: #1f1a1a !important; border-color: #372525 !important; color: #6b5353 !important; cursor: not-allowed !important; box-shadow: none !important; }
.slots-mentiras { display: flex; justify-content: center; gap: 10px; margin: 5px 0; }
.slot-item { width: 38px; height: 38px; border-radius: 50%; background: #2d2222; border: 2px solid #451a1a; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem; }
.slot-ocupado { background: #ef4444 !important; border-color: #fff !important; animation: pop 0.3s ease-in-out; }
.lista-mentiras-texto { text-align: left; background: rgba(0,0,0,0.3); padding: 10px 14px; border-radius: 10px; font-size: 0.8rem; color: #fca5a5; max-height: 90px; overflow-y: auto; border: 1px solid #451a1a; }
.frase-colada { margin: 4px 0; line-height: 1.3; font-style: italic; }
@keyframes pop { 0% { transform: scale(0.8); } 100% { transform: scale(1); } }
</style>