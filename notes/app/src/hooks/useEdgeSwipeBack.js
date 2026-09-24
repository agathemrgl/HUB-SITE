import { useRef } from 'react';

// Reproduit le geste "retour" d'iOS : un doigt posé près du bord gauche de l'écran, tiré
// vers la droite, déclenche onBack — comme le swipe-back système utilisé dans Notes,
// Mail, Réglages, etc. Annulé si le doigt part plus verticalement qu'horizontalement
// (pour ne pas gêner le scroll normal des listes juste à côté du bord).
const EDGE_WIDTH_PX = 24;
const SWIPE_THRESHOLD_PX = 80;
const MAX_VERTICAL_DRIFT_PX = 60;

export function useEdgeSwipeBack(onBack) {
  const start = useRef(null);
  const tracking = useRef(false);

  function onTouchStart(e) {
    const touch = e.touches[0];
    tracking.current = touch.clientX <= EDGE_WIDTH_PX;
    start.current = tracking.current ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function onTouchMove(e) {
    if (!tracking.current || !start.current) return;
    const touch = e.touches[0];
    if (Math.abs(touch.clientY - start.current.y) > MAX_VERTICAL_DRIFT_PX) tracking.current = false;
  }

  function onTouchEnd(e) {
    if (!tracking.current || !start.current) return;
    tracking.current = false;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - start.current.x;
    const dy = Math.abs(touch.clientY - start.current.y);
    if (dx > SWIPE_THRESHOLD_PX && dx > dy) onBack();
  }

  return { onTouchStart, onTouchMove, onTouchEnd };
}
