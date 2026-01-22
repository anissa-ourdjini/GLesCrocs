// backend/src/services/queueAI.js
// Petite IA pour estimer le temps d’attente de chaque commande

/**
 * Estime le temps d’attente pour chaque commande dans la file.
 * @param {Array} queue - Liste des commandes (chaque commande doit avoir un status et un avg_prep_seconds)
 * @param {number} currentServing - Numéro de ticket en cours
 * @returns {Array} - Liste des commandes avec estimation en secondes
 */
function estimateQueue(queue, currentServing = 0) {
  // Pour chaque commande, le temps d'attente = somme des avg_prep_seconds des commandes devant
  const MAX_WAIT_SECONDS = 120 * 60; // 120 minutes
  return queue.map((order, idx) => {
    const waitBefore = queue.slice(0, idx).reduce((sum, o) => sum + (o.avg_prep_seconds || 300), 0);
    const ownPrep = order.avg_prep_seconds || 300;
    return {
      ...order,
      estimated_wait_seconds: Math.min(waitBefore + ownPrep, MAX_WAIT_SECONDS)
    };
  });
}

export { estimateQueue };