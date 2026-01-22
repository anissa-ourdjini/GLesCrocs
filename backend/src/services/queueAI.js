// Calcule le temps d'attente estimé pour chaque commande
function estimateQueue(queue) {
  return queue.map((order, idx) => {
    const waitBefore = queue.slice(0, idx).reduce((sum, o) => sum + (o.avg_prep_seconds || 300), 0);
    return {
      ...order,
      estimated_wait_seconds: waitBefore + (order.avg_prep_seconds || 300)
    };
  });
}

export { estimateQueue };
