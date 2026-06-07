    <template>
    <div class="overlays-wrapper">
        
        <div v-if="mostrarPopUpLinea && lineaCantadaPor" class="overlay-linea-pro">
        <div class="linea-card">
            <button class="btn-cerrar-modal-pro" @click="$emit('cerrarLinea')">×</button>
            
            <span class="emoji-linea">📢</span>
            <h3>¡LÍNEA!</h3>
            <p><strong>{{ lineaCantadaPor }}</strong> ha cantado línea.</p>
        </div>
        </div>

        <div v-if="alguienHaGanado" class="overlay-ganador-pro">
        <div class="card-aviso-ganador">
            <span class="emoji-celebra">🏆</span>
            <h2 class="titulo-bingo-negro">¡BINGO!</h2>
            <p><strong>{{ nombreGanador }}</strong> ha cantado bingo.</p>
            
            <div class="divisor-pro"></div>
            
    <button @click="$emit('reiniciar')" class="btn-reiniciar-pro">
    🔄 NUEVA PARTIDA
    </button>
        </div>
        </div>

    </div>
    </template>

    <script setup>
    defineProps({
    mostrarPopUpLinea: Boolean,
    lineaCantadaPor: String,
    alguienHaGanado: Boolean,
    nombreGanador: String
    })

    defineEmits(['cerrarLinea', 'reiniciar'])
    </script>

    <style scoped>
    /* Estilos base de los Overlays */
    .overlay-linea-pro, .overlay-ganador-pro {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 20px;
    backdrop-filter: blur(8px);
    }

    .overlay-linea-pro { background: rgba(0, 0, 0, 0.6); }
    .overlay-ganador-pro { background: rgba(0, 0, 0, 0.85); }

    /* Tarjetas */
    .linea-card, .card-aviso-ganador {
    background: white;
    width: 100%;
    max-width: 340px;
    padding: 40px 30px;
    border-radius: 28px;
    text-align: center;
    position: relative;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
    }

    .linea-card {
    background: #fef08a;
    border: 4px solid #ca8a04;
    }

    /* Título Bingo en Negro */
    .titulo-bingo-negro {
    color: #000 !important;
    font-family: 'Inter', 'Impact', sans-serif;
    font-weight: 900;
    font-size: 2.5rem;
    margin: 10px 0;
    text-transform: uppercase;
    }

    /* La Cruz de Cierre */
    .btn-cerrar-modal-pro {
    position: absolute;
    top: 10px;
    right: 15px;
    background: #000;
    color: #fff;
    border: none;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: bold;
    cursor: pointer;
    }

    .emoji-linea, .emoji-celebra {
    font-size: 2rem;
    display: block;
    margin-bottom: 10px;
    }

    .divisor-pro {
    height: 1px;
    background: #eee;
    margin: 20px 0;
    }

    .btn-reiniciar-pro {
    width: 100%;
    padding: 18px;
    background: #000;
    color: #fff;
    border: none;
    border-radius: 12px;
    font-weight: 900;
    text-transform: uppercase;
    cursor: pointer;
    }
    </style>