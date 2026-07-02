const GWIPE_COLS = 6;
const GWIPE_DURATION = 850;
const GWIPE_STAGGER = 75;

function createCells(overlay, modifier) {
  for (let c = 0; c < GWIPE_COLS; c++) {
    const cell = document.createElement('div');
    cell.className = `gwipe-cell gwipe-cell--${modifier}`;
    cell.style.transitionDelay = `${c * GWIPE_STAGGER}ms`;
    overlay.appendChild(cell);
  }
}

/* Animación de ENTRADA: celdas ya están en el HTML, solo disparar is-wiping */
function setupGridWipeEnter() {
  const overlay = document.getElementById('gridWipe');
  if (!overlay) return;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => overlay.classList.add('is-wiping'));
  });

  const totalMs = (GWIPE_COLS - 1) * GWIPE_STAGGER + GWIPE_DURATION;
  setTimeout(() => overlay.remove(), totalMs + 100);
}

/* Animación de SALIDA: tiras caen de arriba a abajo, luego navega */
function setupGridWipeExit(href) {
  const overlay = document.createElement('div');
  overlay.id = 'gridWipeExit';
  document.body.appendChild(overlay);

  createCells(overlay, 'exit');

  requestAnimationFrame(() => {
    requestAnimationFrame(() => overlay.classList.add('is-covering'));
  });

  const totalMs = (GWIPE_COLS - 1) * GWIPE_STAGGER + GWIPE_DURATION;
  setTimeout(() => { window.location.href = href; }, totalMs);
}

document.addEventListener('DOMContentLoaded', () => {
  /* Entrada (detail page: tiene #gridWipe en el HTML) */
  setupGridWipeEnter();

  /* Salida (cualquier link con data-wipe) */
  document.querySelectorAll('a[data-wipe]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      setupGridWipeExit(link.href);
    });
  });
});
