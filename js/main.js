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

function updateScrollReveal(section, words) {
  const rect = section.getBoundingClientRect();
  const pinnedRange = section.offsetHeight - window.innerHeight;
  const progress = pinnedRange > 0
    ? Math.min(Math.max(-rect.top / pinnedRange, 0), 1)
    : 0;

  const revealCount = Math.round(progress * words.length);

  words.forEach((wordSpan, i) => {
    wordSpan.classList.toggle('revealed', i < revealCount);
  });
}

function updateHeroShrink(manifestoSection, heroImg) {
  const rect = manifestoSection.getBoundingClientRect();
  const progress = getProgress(rect, window.innerHeight, 1, 0);

  const scale = 1 - progress * 0.15;
  heroImg.style.transform = `scale(${scale})`;
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
  let isDragging = false;
  let dragStartX = 0;
  let dragStartOffset = 0;

  function measure() {
    loopWidth = track.scrollWidth / 2;
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
    updateActiveCard();
  }

  function updateActiveCard() {
    const wrapperRect = wrapper.getBoundingClientRect();
    const wrapperCenter = wrapperRect.left + wrapperRect.width / 2;

    let closest = null;
    let closestDist = Infinity;

    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const cardCenter = rect.left + rect.width / 2;
      const dist = Math.abs(cardCenter - wrapperCenter);
      if (dist < closestDist) {
        closestDist = dist;
        closest = card;
      }
    });

    cards.forEach((card) => card.classList.toggle('is-center', card === closest));
  }

  measure();
  setInitialOffset();
  render();

  window.addEventListener('resize', () => {
    measure();
    wrap();
    render();
  });

  function startDrag(clientX) {
    isDragging = true;
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
    wrapper.classList.remove('dragging');
  }

  wrapper.addEventListener('mousedown', (e) => startDrag(e.clientX));
  window.addEventListener('mousemove', (e) => moveDrag(e.clientX));
  window.addEventListener('mouseup', endDrag);

  wrapper.addEventListener('touchstart', (e) => startDrag(e.touches[0].clientX), { passive: true });
  wrapper.addEventListener('touchmove', (e) => moveDrag(e.touches[0].clientX), { passive: true });
  wrapper.addEventListener('touchend', endDrag);
}

function setupTestimonialsCarousel() {
  const wrapper = document.querySelector('.testimonials-track-wrapper');
  const track = document.getElementById('testimonialsTrack');
  if (!wrapper || !track) return;

  const originalCards = Array.from(track.children);
  originalCards.forEach((card) => {
    track.appendChild(card.cloneNode(true));
  });

  const speed = 0.5;
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

const PASO_STEPS = {
  1: {
    number: '01',
    name: 'Selección de materiales',
    desc: 'Cada veta es única y cada elección influye en el carácter del instrumento. Trabajamos con maderas seleccionadas como <strong>cedro, palisandro, ébano y caoba</strong>, elegidas por su resonancia, estabilidad y belleza natural.',
    img: 'assets/img/etapa_01.png',
    frameLabel: 'SELECCIÓN DE MADERAS',
  },
  2: {
    number: '02',
    name: 'Corte y moldeado',
    desc: 'Próximamente.',
    img: null,
    frameLabel: 'CORTE Y MOLDEADO',
  },
  3: {
    number: '03',
    name: 'Ensamblaje',
    desc: 'Próximamente.',
    img: null,
    frameLabel: 'ENSAMBLAJE',
  },
  4: {
    number: '04',
    name: 'Acabados',
    desc: 'Próximamente.',
    img: null,
    frameLabel: 'ACABADOS',
  },
  5: {
    number: '05',
    name: 'Calibración',
    desc: 'Próximamente.',
    img: null,
    frameLabel: 'CALIBRACIÓN',
  },
};

function setupPasoStepper() {
  const dots = document.querySelectorAll('.stepper-dot');
  const progress = document.getElementById('stepperProgress');
  const numberEl = document.getElementById('pasoNumber');
  const nameEl = document.getElementById('pasoName');
  const descEl = document.getElementById('pasoDesc');
  const frameEl = document.getElementById('pasoFrame');
  const imgEl = document.getElementById('pasoImg');
  const labelEl = document.getElementById('pasoFrameLabel');
  const tagEl = document.getElementById('pasoFrameTag');
  if (!dots.length || !progress) return;

  const fadeEls = [numberEl, nameEl, descEl, labelEl, tagEl, imgEl];
  const FADE_MS = 350;
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
    nameEl.textContent = data.name;
    descEl.innerHTML = data.desc;
    tagEl.textContent = `ETAPA ${data.number}`;
    labelEl.textContent = data.frameLabel;

    if (data.img) {
      imgEl.src = data.img;
      imgEl.alt = data.name;
      frameEl.style.display = '';
    } else {
      frameEl.style.display = 'none';
    }
  }

  function goToStep(step) {
    if (step === currentStep || isFading) return;
    currentStep = step;
    isFading = true;
    fadeEls.forEach((el) => el.classList.add('is-fading'));
    setTimeout(() => {
      applyStep(step);
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

        const step = Math.min(dots.length, Math.floor(rawProgress * dots.length) + 1);
        goToStep(step);
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll);
    onScroll();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');

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

  setupTestimonialsCarousel();
  setupAccordion();
  setupPasoStepper();
  setupGallery();

  const manifestoSection = document.querySelector('.manifesto');
  const manifestoText = document.querySelector('.manifesto-text');
  const heroImg = document.querySelector('.hero-img');
  const siteHeader = document.querySelector('.site-header');
  if (!manifestoSection || !manifestoText) return;

  splitIntoWords(manifestoText);
  const words = manifestoText.querySelectorAll('.word');

  let ticking = false;
  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateScrollReveal(manifestoSection, words);
        if (heroImg) updateHeroShrink(manifestoSection, heroImg);
        if (siteHeader) siteHeader.classList.toggle('scrolled', window.scrollY > 250);
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll);
  onScroll();
});
