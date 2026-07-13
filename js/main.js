function setupLenis() {
  if (typeof Lenis === 'undefined') return;

  const lenis = new Lenis({
    duration: 0.7,
    easing: (t) => 1 - Math.pow(1 - t, 3),
    smoothWheel: true,
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  document.querySelectorAll('a[href*="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      if (link.getAttribute('href') === '#') {
        e.preventDefault();
        return;
      }

      let url;
      try {
        url = new URL(link.href);
      } catch (err) {
        return;
      }
      if (url.pathname === window.location.pathname && url.hash) {
        const target = document.querySelector(url.hash);
        if (target) {
          e.preventDefault();
          lenis.scrollTo(target, { offset: -80 });
        }
      }
    });
  });
}

setupLenis();

function splitIntoWords(paragraph) {
  const colorMap = { 'text-dark': 'dark', 'text-orange': 'orange', 'text-gray': 'dark' };
  const words = [];

  paragraph.querySelectorAll('span').forEach((span) => {
    const color = colorMap[span.className] || 'dark';
    span.textContent.trim().split(/\s+/).forEach((word) => {
      words.push({ word, color });
    });
  });

  paragraph.innerHTML = '';
  words.forEach(({ word, color }, i) => {
    const wordSpan = document.createElement('span');
    wordSpan.className = 'word';
    wordSpan.dataset.color = color;
    wordSpan.textContent = word;
    paragraph.appendChild(wordSpan);
    if (i < words.length - 1) {
      paragraph.appendChild(document.createTextNode(' '));
    }
  });
}

function getProgress(rect, viewportHeight, startRatio, endRatio) {
  const start = viewportHeight * startRatio;
  const end = viewportHeight * endRatio;
  return Math.min(Math.max((start - rect.top) / (start - end), 0), 1);
}

function updateScrollReveal(section, words, lineTop, lineBottom) {
  const rect = section.getBoundingClientRect();
  const pinnedRange = section.offsetHeight - window.innerHeight;
  const progress = pinnedRange > 0
    ? Math.min(Math.max(-rect.top / pinnedRange, 0), 1)
    : 0;

  const revealCount = Math.round(progress * words.length);

  words.forEach((wordSpan, i) => {
    wordSpan.classList.toggle('revealed', i < revealCount);
    // La palabra siguiente a revelar se "anticipa" en naranja antes de
    // pasar a su color final, marcando el borde de avance de la lectura.
    wordSpan.classList.toggle('is-leading', i === revealCount);
  });

  const revealPercent = (1 - progress) * 100;
  if (lineTop) lineTop.style.clipPath = `inset(0 ${revealPercent}% 0 0)`;
  if (lineBottom) lineBottom.style.clipPath = `inset(0 0 0 ${revealPercent}%)`;
}

function updateHeroShrink(manifestoSection, heroImg) {
  const rect = manifestoSection.getBoundingClientRect();
  const progress = getProgress(rect, window.innerHeight, 1, 0);

  const scale = 1 - progress * 0.15;
  heroImg.style.transform = `scale(${scale})`;
}

function setupExploreCards() {
  const cards = document.getElementById('exploreCards');
  const nextBtn = document.getElementById('exploreNext');
  const prevBtn = document.getElementById('explorePrev');
  if (!cards || !nextBtn || !prevBtn) return;

  function getStep() {
    const card = cards.querySelector('.explore-card');
    if (!card) return 300;
    const gap = parseFloat(getComputedStyle(cards).columnGap) || 0;
    return card.getBoundingClientRect().width + gap;
  }

  nextBtn.addEventListener('click', () => {
    const step = getStep();
    const atEnd = cards.scrollLeft + cards.clientWidth >= cards.scrollWidth - 10;
    const target = atEnd ? 0 : cards.scrollLeft + step;
    cards.scrollTo({ left: target, behavior: 'smooth' });
    prevBtn.classList.toggle('is-visible', target > 10);
  });

  prevBtn.addEventListener('click', () => {
    const step = getStep();
    const target = Math.max(cards.scrollLeft - step, 0);
    cards.scrollTo({ left: target, behavior: 'smooth' });
    prevBtn.classList.toggle('is-visible', target > 10);
  });

  cards.addEventListener('scroll', () => {
    prevBtn.classList.toggle('is-visible', cards.scrollLeft > 10);
  });
}

function setupRecorridoReveal() {
  const steps = document.querySelectorAll('.recorrido-step');
  if (!steps.length) return;

  steps.forEach((step) => {
    const title = step.querySelector('.recorrido-step-title');
    const desc = step.querySelector('.recorrido-step-desc');
    if (title) title.innerHTML = maskifyWords(title.innerHTML);
    if (desc) desc.innerHTML = maskifyWords(desc.innerHTML);
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        const title = entry.target.querySelector('.recorrido-step-title');
        const desc = entry.target.querySelector('.recorrido-step-desc');
        if (title) title.classList.add('is-revealed');
        if (desc) desc.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.25 });

  steps.forEach((step) => observer.observe(step));
}

function setupRecorridoGlow() {
  const section = document.querySelector('.detail-recorrido');
  const glows = section ? section.querySelectorAll('.paso-glow') : [];
  if (!section || !glows.length) return;

  let ticking = false;
  function update() {
    const rect = section.getBoundingClientRect();
    const range = rect.height - window.innerHeight;
    const progress = range > 0 ? Math.min(Math.max(-rect.top / range, 0), 1) : 0;
    const travel = rect.height - 640;
    const offset = progress * travel;

    glows.forEach((glow) => {
      glow.style.transform = `translateY(${offset}px)`;
    });
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  });
  update();
}

function setupRecorridoLineFill() {
  const timeline = document.querySelector('.recorrido-timeline');
  const line = document.getElementById('recorridoProgressLine');
  const dots = document.querySelectorAll('.recorrido-dot');
  if (!timeline || !line || !dots.length) return;

  // La línea empieza y termina en el centro del primer/último punto en vez de
  // ocupar todo el alto del contenedor (que suele ser más alto por el resto
  // del contenido de cada fila).
  let lineStart = 0;
  let lineLength = 0;

  function measureLine() {
    const timelineRect = timeline.getBoundingClientRect();
    const firstDot = dots[0].getBoundingClientRect();
    const lastDot = dots[dots.length - 1].getBoundingClientRect();

    lineStart = firstDot.top + firstDot.height / 2 - timelineRect.top;
    lineLength = (lastDot.top + lastDot.height / 2) - (firstDot.top + firstDot.height / 2);

    timeline.style.setProperty('--line-start', `${lineStart}px`);
    timeline.style.setProperty('--line-length', `${lineLength}px`);
  }

  let ticking = false;
  function update() {
    const timelineRect = timeline.getBoundingClientRect();
    const lineTop = timelineRect.top + lineStart;
    const triggerY = window.innerHeight * 0.5;
    const progress = lineLength > 0 ? Math.min(Math.max((triggerY - lineTop) / lineLength, 0), 1) : 0;

    line.style.transform = `translateX(-50%) scaleY(${progress})`;

    dots.forEach((dot) => {
      const dotRect = dot.getBoundingClientRect();
      const passed = dotRect.top + dotRect.height / 2 <= triggerY;
      dot.classList.toggle('is-active', passed);
    });

    ticking = false;
  }

  measureLine();
  window.addEventListener('resize', measureLine);

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  });
  update();
}

function setupStatCounters() {
  const counters = document.querySelectorAll('.stat-count');
  if (!counters.length) return;

  const animateCounter = (el) => {
    const target = parseInt(el.dataset.target, 10);
    const duration = 1400;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  counters.forEach((el) => observer.observe(el));
}

function setupScrollInset(selector, maxInsetDesktop = 137, maxInsetMobile = 30) {
  const frame = document.querySelector(selector);
  if (!frame) return;

  let ticking = false;
  function update() {
    const maxInset = window.innerWidth <= 900 ? maxInsetMobile : maxInsetDesktop;
    const rect = frame.getBoundingClientRect();
    // Arranca con margen cuando la sección recién entra en pantalla
    // y llega a full width (0px) cuando la sección ocupa casi todo el alto
    // de la ventana, ya scrolleada hacia el centro.
    const start = window.innerHeight;
    const end = window.innerHeight * 0.15;
    const progress = Math.min(Math.max((start - rect.top) / (start - end), 0), 1);
    const inset = Math.round(maxInset * (1 - progress));

    frame.style.margin = `0 ${inset}px`;
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  });
  window.addEventListener('resize', update);
  update();
}

function setupVideoModal() {
  const openBtn = document.getElementById('videoOpenBtn');
  const closeBtn = document.getElementById('videoCloseBtn');
  const modal = document.getElementById('videoModal');
  const iframe = document.getElementById('videoModalIframe');
  if (!openBtn || !closeBtn || !modal || !iframe) return;

  const videoSrc = 'https://player.vimeo.com/video/1209308640?badge=0&autopause=0&player_id=0&app_id=58479&autoplay=1';

  function openModal() {
    iframe.src = videoSrc;
    modal.classList.add('is-open');
  }

  function closeModal() {
    modal.classList.remove('is-open');
    iframe.src = '';
  }

  openBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
  });
}

function setupGallery() {
  const wrapper = document.getElementById('galleryWrapper');
  const track = document.getElementById('galleryTrack');
  if (!wrapper || !track) return;

  const originalCards = Array.from(track.children);
  originalCards.forEach((card) => {
    track.appendChild(card.cloneNode(true));
  });
  const cards = Array.from(track.children);

  let offset = 0;
  let loopWidth = 0;
  let cardStep = 0;

  function measure() {
    // Se calcula el "paso" real entre tarjetas (ancho + gap) y el largo del
    // loop a partir de ese paso, en vez de scrollWidth/2: con un número impar
    // de gaps totales, la mitad del scrollWidth no coincide exactamente con
    // "N tarjetas + su espacio", y ese desfase se acumulaba en cada wrap().
    cardStep = originalCards.length > 1
      ? originalCards[1].offsetLeft - originalCards[0].offsetLeft
      : track.scrollWidth / 2;
    loopWidth = cardStep * originalCards.length;
  }

  function wrap() {
    if (loopWidth === 0) return;
    offset = ((offset % loopWidth) + loopWidth) % loopWidth;
  }

  function setInitialOffset() {
    const wrapperWidth = wrapper.offsetWidth;
    const centerCard = originalCards.find((c) => c.dataset.size === 'center');
    const centerOffsetInTrack = centerCard.offsetLeft + centerCard.offsetWidth / 2;
    offset = centerOffsetInTrack - wrapperWidth / 2;
    wrap();
  }

  function render() {
    track.style.transform = `translateX(${-offset}px)`;
  }

  function updateActiveCard() {
    const wrapperRect = wrapper.getBoundingClientRect();
    const wrapperCenter = wrapperRect.left + wrapperRect.width / 2;

    let closest = null;
    let closestDist = Infinity;
    let closestLogicalIndex = 0;

    cards.forEach((card, i) => {
      const rect = card.getBoundingClientRect();
      const cardCenter = rect.left + rect.width / 2;
      const dist = Math.abs(cardCenter - wrapperCenter);
      if (dist < closestDist) {
        closestDist = dist;
        closest = card;
        closestLogicalIndex = i % originalCards.length;
      }
    });

    centerLogicalIndex = closestLogicalIndex;
    applyActiveByLogicalIndex(centerLogicalIndex);
  }

  // El carrusel es infinito: el track está duplicado (originales + clones) y el
  // offset nunca se "recorta" antes de animar, así que al llegar al final sigue
  // de largo por las copias clonadas en vez de saltar para atrás.
  let centerLogicalIndex = originalCards.findIndex((c) => c.dataset.size === 'center');
  if (centerLogicalIndex === -1) centerLogicalIndex = 0;

  function applyActiveByLogicalIndex(logicalIdx) {
    cards.forEach((card, i) => {
      card.classList.toggle('is-center', i % originalCards.length === logicalIdx);
    });
  }

  measure();
  setInitialOffset();
  render();
  applyActiveByLogicalIndex(centerLogicalIndex);

  window.addEventListener('resize', () => {
    measure();
    wrap();
    render();
    updateActiveCard();
  });

  function goToOffset(newOffset) {
    // No se "recorta" (wrap) antes de animar: así el track sigue de largo
    // visualmente por las tarjetas clonadas en vez de saltar para atrás.
    // Misma duración/easing que el slider de testimonios de arriba.
    offset = newOffset;
    track.style.transition = 'transform 900ms cubic-bezier(0.3, 1.2, 0.6, 1)';
    render();
    setTimeout(() => {
      track.style.transition = '';
      wrap();
      render();
    }, 900);
  }

  function goToStep(dir) {
    centerLogicalIndex = (centerLogicalIndex + dir + originalCards.length) % originalCards.length;
    applyActiveByLogicalIndex(centerLogicalIndex);
    goToOffset(offset + dir * cardStep);
  }

  const prevBtn = document.getElementById('galleryPrev');
  const nextBtn = document.getElementById('galleryNext');

  if (prevBtn) prevBtn.addEventListener('click', () => goToStep(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => goToStep(1));
}

function setupTestimonialsCarousel() {
  const wrapper = document.querySelector('.testimonials-track-wrapper');
  const track = document.getElementById('testimonialsTrack');
  if (!wrapper || !track) return;

  const originalCards = Array.from(track.children);
  originalCards.forEach((card) => {
    track.appendChild(card.cloneNode(true));
  });

  const speed = 1.2;
  let offset = 0;
  let loopWidth = 0;
  let isHovering = false;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartOffset = 0;

  function measure() {
    loopWidth = track.scrollWidth / 2;
  }
  measure();
  window.addEventListener('resize', measure);

  function wrap() {
    if (loopWidth === 0) return;
    offset = ((offset % loopWidth) + loopWidth) % loopWidth;
  }

  function render() {
    track.style.transform = `translateX(${-offset}px)`;
  }

  function tick() {
    if (!isHovering && !isDragging) {
      offset += speed;
      wrap();
      render();
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  wrapper.addEventListener('mouseenter', () => {
    isHovering = true;
  });
  wrapper.addEventListener('mouseleave', () => {
    isHovering = false;
    isDragging = false;
    wrapper.classList.remove('dragging');
  });

  function startDrag(clientX) {
    isDragging = true;
    isHovering = false;
    dragStartX = clientX;
    dragStartOffset = offset;
    wrapper.classList.add('dragging');
  }

  function moveDrag(clientX) {
    if (!isDragging) return;
    offset = dragStartOffset - (clientX - dragStartX);
    wrap();
    render();
  }

  function endDrag() {
    isDragging = false;
    isHovering = false;
    wrapper.classList.remove('dragging');
  }

  wrapper.addEventListener('mousedown', (e) => startDrag(e.clientX));
  window.addEventListener('mousemove', (e) => moveDrag(e.clientX));
  window.addEventListener('mouseup', endDrag);

  wrapper.addEventListener('touchstart', (e) => startDrag(e.touches[0].clientX), { passive: true });
  wrapper.addEventListener('touchmove', (e) => moveDrag(e.touches[0].clientX), { passive: true });
  wrapper.addEventListener('touchend', endDrag);
}

function setupAccordion() {
  const items = document.querySelectorAll('.accordion-item');
  if (!items.length) return;

  function openItem(item) {
    const panel = item.querySelector('.accordion-panel');
    item.classList.add('is-active');
    panel.style.maxHeight = `${panel.scrollHeight}px`;
  }

  function closeItem(item) {
    const panel = item.querySelector('.accordion-panel');
    item.classList.remove('is-active');
    panel.style.maxHeight = '0px';
  }

  items.forEach((item) => {
    const header = item.querySelector('.accordion-header');
    header.addEventListener('click', () => {
      const isActive = item.classList.contains('is-active');
      items.forEach(closeItem);
      if (!isActive) openItem(item);
    });
  });

  const activeItem = document.querySelector('.accordion-item.is-active');
  if (activeItem) openItem(activeItem);

  window.addEventListener('resize', () => {
    const current = document.querySelector('.accordion-item.is-active');
    if (current) openItem(current);
  });
}

const COURSE_TESTIMONIALS = [
  {
    name: 'Juan Ortega',
    quote: '&ldquo;El acompañamiento hizo que todo el proceso fuera mucho más simple.&rdquo;',
    img: 'assets/img/testimonio_curso_juan.jpg',
    date: 'assets/img/Fechas_Testimonio_Febrero.png',
    dateOffset: -16,
  },
  {
    name: 'Paula Pergolini',
    quote: '&ldquo;Nunca imaginé que podría construir una guitarra. Hoy la toco todos los días.&rdquo;',
    img: 'assets/img/testimonio_curso_paula.jpg',
    objectPosition: '38% center',
    date: 'assets/img/Fechas_Testimonio_Mayo.png',
    dateOffset: -60,
  },
  {
    name: 'Julio Demner',
    quote: '&ldquo;El ambiente del taller y el equipo docente hicieron que cada clase valiera la pena.&rdquo;',
    img: 'assets/img/testimonio_curso_julio.jpg',
    date: 'assets/img/Fechas_Testimonio_Noviembre.png',
  },
];

function setupCourseTestimonial() {
  const section = document.getElementById('courseTestimonial');
  const track = document.getElementById('courseTestimonialTrack');
  const contentTrack = document.getElementById('courseTestimonialContentTrack');
  if (!section || !track || !contentTrack) return;

  const prevBtn = document.getElementById('courseTestimonialPrev');
  const nextBtn = document.getElementById('courseTestimonialNext');
  let current = 0;
  let currentSlide = track.querySelector('.course-testimonial-slide');
  let currentContent = contentTrack.querySelector('.course-testimonial-content');
  let isAnimating = false;
  const SLIDE_MS = 900;
  const EASING = 'cubic-bezier(0.3, 1.2, 0.6, 1)';

  COURSE_TESTIMONIALS.forEach((item) => {
    const preload = new Image();
    preload.src = item.img;
  });

  function buildSlide(item) {
    const slide = document.createElement('div');
    slide.className = 'course-testimonial-slide';
    const position = item.objectPosition || 'center';
    slide.innerHTML = `
      <img src="${item.img}" alt="${item.name}" class="course-testimonial-img" style="object-position: ${position};">
      <div class="course-testimonial-overlay"></div>
    `;
    return slide;
  }

  function buildContent(item) {
    const content = document.createElement('div');
    content.className = 'course-testimonial-content';
    content.innerHTML = `
      <p class="course-testimonial-name">${item.name}</p>
      <div class="course-testimonial-quote-block">
        <p class="course-testimonial-quote">${item.quote}</p>
        ${item.date ? `<img src="${item.date}" alt="" class="course-testimonial-date" aria-hidden="true"${item.dateOffset ? ` style="margin-left: ${item.dateOffset}px;"` : ''}>` : ''}
      </div>
    `;
    return content;
  }

  function goTo(index, dir) {
    if (isAnimating || index === current) return;
    isAnimating = true;
    current = index;

    const outTo = dir === 'next' ? '-100%' : '100%';
    const inFrom = dir === 'next' ? '100%' : '-100%';

    const item = COURSE_TESTIMONIALS[index];
    const nextSlide = buildSlide(item);
    const nextContent = buildContent(item);
    nextSlide.style.transform = `translateX(${inFrom})`;
    nextSlide.style.zIndex = '2';
    nextContent.style.transform = `translateX(${inFrom})`;
    nextContent.style.zIndex = '2';
    track.appendChild(nextSlide);
    contentTrack.appendChild(nextContent);

    // Forzar reflow antes de animar para que la transición arranque desde inFrom
    void nextSlide.offsetWidth;

    requestAnimationFrame(() => {
      currentSlide.style.transition = `transform ${SLIDE_MS}ms ${EASING}`;
      nextSlide.style.transition = `transform ${SLIDE_MS}ms ${EASING}`;
      currentContent.style.transition = `transform ${SLIDE_MS}ms ${EASING}`;
      nextContent.style.transition = `transform ${SLIDE_MS}ms ${EASING}`;
      currentSlide.style.transform = `translateX(${outTo})`;
      nextSlide.style.transform = 'translateX(0)';
      currentContent.style.transform = `translateX(${outTo})`;
      nextContent.style.transform = 'translateX(0)';
    });

    setTimeout(() => {
      currentSlide.remove();
      currentContent.remove();
      currentSlide = nextSlide;
      currentContent = nextContent;
      isAnimating = false;
    }, SLIDE_MS + 50);
  }

  prevBtn.addEventListener('click', () => {
    goTo((current - 1 + COURSE_TESTIMONIALS.length) % COURSE_TESTIMONIALS.length, 'prev');
  });

  nextBtn.addEventListener('click', () => {
    goTo((current + 1) % COURSE_TESTIMONIALS.length, 'next');
  });
}

function setupFaq() {
  const items = document.querySelectorAll('.faq-item');
  if (!items.length) return;

  function openItem(item) {
    const panel = item.querySelector('.faq-panel');
    item.classList.add('is-active');
    panel.style.maxHeight = `${panel.scrollHeight}px`;
  }

  function closeItem(item) {
    const panel = item.querySelector('.faq-panel');
    item.classList.remove('is-active');
    panel.style.maxHeight = '0px';
  }

  items.forEach((item) => {
    const header = item.querySelector('.faq-header');
    header.addEventListener('click', () => {
      const isActive = item.classList.contains('is-active');
      items.forEach(closeItem);
      if (!isActive) openItem(item);
    });
  });

  window.addEventListener('resize', () => {
    const current = document.querySelector('.faq-item.is-active');
    if (current) openItem(current);
  });
}

/* Envuelve cada palabra en una máscara (overflow:hidden) para poder
   revelarla deslizándola desde abajo. Preserva <strong> si lo hay. */
function maskifyWords(html) {
  const container = document.createElement('div');
  container.innerHTML = html;
  const STAGGER = 28;
  let wordIndex = 0;
  const parts = [];

  function processText(text, bold) {
    text.split(/(\s+)/).forEach((chunk) => {
      if (chunk === '') return;
      if (/^\s+$/.test(chunk)) {
        parts.push(chunk);
        return;
      }
      const delay = wordIndex * STAGGER;
      const inner = bold ? `<strong>${chunk}</strong>` : chunk;
      parts.push(`<span class="mask-line"><span class="mask-word" style="transition-delay:${delay}ms">${inner}</span></span>`);
      wordIndex++;
    });
  }

  container.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      processText(node.textContent, false);
    } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'STRONG') {
      processText(node.textContent, true);
    } else {
      parts.push(node.textContent || '');
    }
  });

  return parts.join('');
}

const PASO_STEPS = {
  1: {
    number: '01',
    name: 'Selección de materiales',
    desc: 'Cada veta es única y cada elección influye en el carácter del instrumento. Trabajamos con maderas seleccionadas como cedro, palisandro, ébano y caoba, elegidas por su resonancia, estabilidad y belleza natural.',
    img: 'assets/img/Etapa01_Polaroid.png',
    frameLabel: 'SELECCIÓN DE MADERAS',
  },
  2: {
    number: '02',
    name: 'Diseño y corte',
    desc: 'Cada instrumento comienza a tomar forma a partir de planos, plantillas y cortes precisos. Cada pieza se trabaja cuidadosamente para garantizar un encastre perfecto y las proporciones que definirán su sonido y comodidad.',
    img: 'assets/img/Etapa02_Polaroid.png',
    frameLabel: 'DISEÑO Y CORTE',
  },
  3: {
    number: '03',
    name: 'Ensamblado',
    desc: 'Con cada pieza preparada, comienza el proceso de unión. Tapa, fondo, aros y mástil se ensamblan cuidadosamente para dar vida a una estructura sólida, equilibrada y lista para desarrollar todo su potencial acústico.',
    img: 'assets/img/Etapa03_Polaroid.png',
    frameLabel: 'ENSAMBLADO',
  },
  4: {
    number: '04',
    name: 'Lijado y terminación',
    desc: 'Cada superficie se trabaja a mano para lograr un acabado uniforme y agradable al tacto. Las terminaciones protegen la madera y resaltan su belleza natural.',
    img: 'assets/img/Etapa04_Polaroid.png',
    frameLabel: 'LIJADO Y TERMINACIÓN',
  },
  5: {
    number: '05',
    name: 'Calibración y puesta a punto',
    desc: 'Antes de entregar el instrumento realizamos los ajustes finales de cuerdas, altura, afinación y entonación. Cada detalle se calibra para ofrecer una experiencia cómoda, precisa y un sonido listo para tocar.',
    img: 'assets/img/Etapa05_Polaroid.png',
    frameLabel: 'CALIBRACIÓN Y PUESTA A PUNTO',
  },
};

function setupPasoStepper() {
  const dots = document.querySelectorAll('.stepper-dot');
  const progress = document.getElementById('stepperProgress');
  const glowBlue = document.getElementById('pasoGlowBlue');
  const glowOrange = document.getElementById('pasoGlowOrange');
  const numberEl = document.getElementById('pasoNumber');
  const nameEl = document.getElementById('pasoName');
  const descEl = document.getElementById('pasoDesc');
  const frameEl = document.getElementById('pasoFrame');
  const imgEl = document.getElementById('pasoImg');
  const stackEl1 = document.getElementById('pasoImgStack1');
  const stackEl2 = document.getElementById('pasoImgStack2');
  const labelEl = document.getElementById('pasoFrameLabel');
  const tagEl = document.getElementById('pasoFrameTag');
  if (!dots.length || !progress) return;

  const TOTAL_STEPS = Object.keys(PASO_STEPS).length;

  // Precarga todas las fotos para que el cambio de src en cada etapa sea
  // instantáneo (si no, la imagen queda en blanco un instante mientras carga).
  Object.values(PASO_STEPS).forEach((data) => {
    if (data.img) {
      const preloadImg = new Image();
      preloadImg.src = data.img;
    }
  });

  const fadeEls = [numberEl, nameEl, descEl, labelEl, tagEl];
  const FADE_MS = 400;
  let currentStep = 1;
  let isFading = false;

  function applyStep(step) {
    const data = PASO_STEPS[step];
    if (!data) return;

    dots.forEach((dot) => {
      const dotStep = Number(dot.dataset.step);
      dot.classList.toggle('is-active', dotStep === step);
      dot.classList.toggle('is-done', dotStep < step);
    });

    numberEl.textContent = data.number;
    tagEl.textContent = `ETAPA ${data.number}`;
    labelEl.textContent = data.frameLabel;

    nameEl.classList.remove('is-revealed');
    descEl.classList.remove('is-revealed');
    nameEl.innerHTML = maskifyWords(data.name);
    descEl.innerHTML = maskifyWords(data.desc);

    if (data.img) {
      imgEl.src = data.img;
      imgEl.alt = data.name;
      frameEl.style.display = '';

      const nextStep1 = (step % TOTAL_STEPS) + 1;
      const nextStep2 = ((step + 1) % TOTAL_STEPS) + 1;
      if (stackEl1) stackEl1.src = PASO_STEPS[nextStep1].img;
      if (stackEl2) stackEl2.src = PASO_STEPS[nextStep2].img;
    } else {
      frameEl.style.display = 'none';
    }

    // Fuerza reflow antes de revelar, para que las palabras arranquen
    // desde su posición oculta y no salten directo al estado final.
    void nameEl.offsetWidth;
    requestAnimationFrame(() => {
      nameEl.classList.add('is-revealed');
      descEl.classList.add('is-revealed');
    });
  }

  function goToStep(step) {
    if (step === currentStep || isFading) return;
    currentStep = step;
    isFading = true;
    fadeEls.forEach((el) => el.classList.add('is-fading'));

    // La foto de arriba se despega hacia un costado mientras, al mismo
    // tiempo, la pila avanza: la que estaba apilada primero pasa al frente.
    frameEl.classList.add('is-leaving');
    frameEl.classList.add('is-shifting');

    setTimeout(() => {
      applyStep(step);

      // Reacomodo instantáneo (sin transición): la foto que "ya estaba ahí"
      // (venía de la pila) queda al frente, y la pila se corre un lugar,
      // sin que nada quede en blanco ni se note el salto.
      [imgEl, stackEl1, stackEl2].forEach((el) => {
        if (el) el.style.transition = 'none';
      });

      frameEl.classList.remove('is-leaving');
      frameEl.classList.remove('is-shifting');

      // Fuerza reflow para que el "sin transición" se aplique antes de
      // restaurar las transiciones en el siguiente frame.
      void frameEl.offsetWidth;
      requestAnimationFrame(() => {
        [imgEl, stackEl1, stackEl2].forEach((el) => {
          if (el) el.style.transition = '';
        });
      });

      fadeEls.forEach((el) => el.classList.remove('is-fading'));
      isFading = false;
    }, FADE_MS);
  }

  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      goToStep(Number(dot.dataset.step));
      const pct = ((Number(dot.dataset.step) - 1) / (dots.length - 1)) * 100;
      progress.style.width = `${pct}%`;
    });
  });

  applyStep(1);

  const section = document.querySelector('.paso-a-paso');
  if (section) {
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const rect = section.getBoundingClientRect();
        const pinnedRange = section.offsetHeight - window.innerHeight;
        const rawProgress = pinnedRange > 0
          ? Math.min(Math.max(-rect.top / pinnedRange, 0), 1)
          : 0;

        progress.style.width = `${rawProgress * 100}%`;

        if (glowBlue) {
          glowBlue.style.transform = `translate(${rawProgress * 60}%, ${rawProgress * 90}%)`;
        }
        if (glowOrange) {
          glowOrange.style.transform = `translate(${-rawProgress * 70}%, ${-rawProgress * 50}%)`;
        }

        const step = Math.min(dots.length, Math.floor(rawProgress * dots.length) + 1);
        goToStep(step);
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll);
    onScroll();
  }
}

function setupWhyCustomParallax() {
  const images = document.querySelectorAll('.why-custom-img');
  if (!images.length) return;

  function updateParallax() {
    images.forEach(img => {
      const container = img.parentElement;
      const rect = container.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      const start = viewportHeight;
      const end = -rect.height;
      const progress = (start - rect.top) / (start - end);
      
      if (progress >= 0 && progress <= 1) {
        const maxTranslate = 50; // pixels
        const translateVal = (progress - 0.5) * 2 * maxTranslate;
        img.style.transform = `translateY(${translateVal}px) scale(1.1)`;
      }
    });
  }

  window.addEventListener('scroll', updateParallax);
  window.addEventListener('resize', updateParallax);
  updateParallax();
}

function setupWhyCustomReveal() {
  const rows = document.querySelectorAll('.why-custom-row');
  if (!rows.length) return;

  rows.forEach((row) => {
    const title = row.querySelector('.why-custom-title');
    const label = row.querySelector('.why-custom-label');
    const tag = row.querySelector('.why-custom-section-tag');
    if (title) title.innerHTML = maskifyWords(title.innerHTML);
    if (label) label.innerHTML = maskifyWords(label.innerHTML);
    if (tag) tag.innerHTML = maskifyWords(tag.innerHTML);
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        const title = entry.target.querySelector('.why-custom-title');
        const label = entry.target.querySelector('.why-custom-label');
        const tag = entry.target.querySelector('.why-custom-section-tag');
        if (title) title.classList.add('is-revealed');
        if (label) label.classList.add('is-revealed');
        if (tag) tag.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.25 });

  rows.forEach((row) => observer.observe(row));

  // Scroll-triggered text opacity animation
  function updateWhyCustomOpacity() {
    rows.forEach((row) => {
      const textWrap = row.querySelector('.why-custom-text-wrap');
      if (!textWrap) return;

      const rect = row.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Calculate progress: 1 when row is centered, 0 when at edges
      const rowCenter = rect.top + rect.height / 2;
      const viewportCenter = viewportHeight / 2;
      const distance = Math.abs(rowCenter - viewportCenter);
      const maxDistance = viewportHeight / 2;

      let opacity = 1 - (distance / maxDistance);
      opacity = Math.max(0, Math.min(1, opacity));

      textWrap.style.opacity = opacity;
    });
  }

  window.addEventListener('scroll', updateWhyCustomOpacity);
  window.addEventListener('resize', updateWhyCustomOpacity);
  updateWhyCustomOpacity();
}


document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links, .course-nav-links');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      hamburger.classList.toggle('active', isOpen);
      hamburger.setAttribute('aria-expanded', isOpen);
    });

    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        hamburger.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  setupStatCounters();
  setupRecorridoGlow();
  setupRecorridoReveal();
  setupRecorridoLineFill();
  setupTestimonialsCarousel();
  setupAccordion();
  setupFaq();
  setupCourseTestimonial();
  setupPasoStepper();
  setupGallery();
  setupScrollInset('.video-frame');
  setupScrollInset('.course-testimonial-track');
  setupExploreCards();
  setupVideoModal();
  setupWhyCustomParallax();
  setupWhyCustomReveal();

  const manifestoSection = document.querySelector('.manifesto');
  const manifestoText = document.querySelector('.manifesto-text');
  const heroImg = document.querySelector('.hero-img');
  const lineTop = document.getElementById('manifestoLineTop');
  const lineBottom = document.getElementById('manifestoLineBottom');

  const statsSection = document.querySelector('.about-stats');
  const statsLineTop = document.getElementById('statsLineTop');
  const statsLineBottom = document.getElementById('statsLineBottom');

  if (!manifestoSection || !manifestoText) return;

  splitIntoWords(manifestoText);
  const words = manifestoText.querySelectorAll('.word');

  let ticking = false;
  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateScrollReveal(manifestoSection, words, lineTop, lineBottom);
        if (heroImg) updateHeroShrink(manifestoSection, heroImg);

        if (statsSection && statsLineTop && statsLineBottom) {
          const rect = statsSection.getBoundingClientRect();
          const progress = getProgress(rect, window.innerHeight, 0.95, 0.1);
          const statsRevealPercent = (1 - progress) * 100;
          statsLineTop.style.clipPath = `inset(0 ${statsRevealPercent}% 0 0)`;
          statsLineBottom.style.clipPath = `inset(0 0 0 ${statsRevealPercent}%)`;
        }

        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll);
  onScroll();
});
