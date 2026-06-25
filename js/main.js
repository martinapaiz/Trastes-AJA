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
