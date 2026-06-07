<template>
  <div class="bingo-container">
    
    <WaitingRoom 
      v-if="ele_actual === 'START'"
      :totalJugadores="totalJugadores"
      :codigoSala="props.codigoSala"
      @comenzar="comenzarJuego"
    />

    <GameBoard 
      v-else
      :ele_actual="ele_actual"
      :nombreTematicaLocal="nombreTematicaLocal"
      :codigoSala="props.codigoSala"
      :votosRecibidos="votosRecibidos"
      :totalJugadores="totalJugadores"
      :carton="carton"
      :yaVotado="yaVotado"
      :listaJugadores="listaJugadores"
      :hanVotado="hanVotado"
      @votar="registrarVoto"
    />

    <BingoPopups 
      :mostrarPopUpLinea="mostrarPopUpLinea"
      :lineaCantadaPor="lineaCantadaPor"
      :alguienHaGanado="alguienHaGanado"
      :nombreGanador="nombreGanador"
      @cerrarLinea="mostrarPopUpLinea = false"
      @reiniciar="reiniciarJuego"
    />

  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useBingo } from '../composables/useBingo' // <-- Cambia a un solo punto (../) porque ahora composables está en la carpeta de bingo

// Importación de los sub-componentes
import WaitingRoom from '../../../components/WaitingRoom.vue' // <-- Cambia: Sube tres niveles para buscar el WaitingRoom global
import GameBoard from '../GameBoard.vue'
import BingoPopups from './BingoPopups.vue'                   // <-- Cambia a (./) porque se mueven juntos  

const props = defineProps(['tematicaId', 'nombreTematica', 'codigoSala', 'usuario'])

// Extraemos TODA la lógica del archivo externo
const {
  ele_actual,
  totalJugadores,
  carton,
  votosRecibidos,
  yaVotado,
  listaJugadores,
  hanVotado,
  mostrarPopUpLinea,
  lineaCantadaPor,
  alguienHaGanado,
  reiniciarTodo,
  nombreGanador,
  nombreTematicaLocal,
  comenzarJuego,
  registrarVoto,
  reiniciarJuego,
  conectarRealtime,
  actualizarListaYVotos
} = useBingo(props)

// Al montar, iniciamos las conexiones que ahora viven en el composable
onMounted(async () => {
  await conectarRealtime()
  await actualizarListaYVotos()
})
</script>

<style scoped>
/* Solo dejamos el estilo del contenedor base */
.bingo-container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>