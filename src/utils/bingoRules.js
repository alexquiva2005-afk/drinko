/**
 * Comprueba si el cartón actual tiene alguna línea completada.
 * Recibe el array de objetos del cartón.
 */
export const tieneLinea = (carton) => {
  // Extraemos solo el estado 'marcada' (true/false) para simplificar el cálculo
  const m = carton.map(celda => celda.marcada);

  // Definición de todas las combinaciones ganadoras (índices del 0 al 8)
  const combinaciones = [
    // Horizontales
    [0, 1, 2], 
    [3, 4, 5], 
    [6, 7, 8],
    
    // Verticales
    [0, 3, 6], 
    [1, 4, 7], 
    [2, 5, 8],
    
    // Diagonales
    [0, 4, 8], 
    [2, 4, 6]
  ];

  // Retorna true si ALGUNA combinación tiene TODAS sus celdas marcadas
  return combinaciones.some(combo => combo.every(idx => m[idx]));
};  
