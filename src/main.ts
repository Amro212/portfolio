import './style.css';
import { RetroComputerScene } from './scene';
import { projects, type Project } from './projects';
import { Terminal } from './terminal';

// ─────────────────────────────────────────
// 1. Initialize Three.js Scene
// ─────────────────────────────────────────
let retroScene: RetroComputerScene | null = null;

function initScene(): void {
  try {
    retroScene = new RetroComputerScene('three-container');
  } catch (e) {
    console.warn('Three.js scene failed to initialize:', e);
  }
}

// ─────────────────────────────────────────
// 2. Navigation
// ─────────────────────────────────────────
function initNavigation(): void {
  const hamburger = document.getElementById('nav-hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  const menuLinks = mobileMenu?.querySelectorAll('.mobile-menu__link');

  if (!hamburger || !mobileMenu) return;

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    mobileMenu.classList.toggle('active');
  });

  menuLinks?.forEach((link) => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      mobileMenu.classList.remove('active');
    });
  });
}

// ─────────────────────────────────────────
// 3. CRT Dithered Portrait
// ─────────────────────────────────────────
function drawDitheredPortrait(): void {
  const canvas = document.getElementById('dither-canvas') as HTMLCanvasElement;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  // Generate a pixel-art style silhouette
  ctx.fillStyle = '#0a0f14';
  ctx.fillRect(0, 0, w, h);

  const pixelSize = 3;
  const cols = Math.floor(w / pixelSize);
  const rows = Math.floor(h / pixelSize);

  // Draw a simple silhouette pattern
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cx = x / cols - 0.5;
      const cy = y / rows - 0.5;

      // Head shape (oval)
      const headY = cy + 0.15;
      const isHead = (cx * cx) / 0.04 + (headY * headY) / 0.035 < 1;

      // Neck
      const neckY = cy - 0.05;
      const isNeck = Math.abs(cx) < 0.06 && neckY > 0 && neckY < 0.08;

      // Shoulders
      const shoulderY = cy - 0.1;
      const isShoulders =
        Math.abs(cx) < 0.35 && shoulderY > 0 && shoulderY < 0.2;
      const shoulderCurve =
        isShoulders && shoulderY < 0.1 + (0.35 - Math.abs(cx)) * 0.5;

      if (isHead || isNeck || shoulderCurve) {
        // Dithering: checkerboard pattern for retro effect
        const dither = (x + y) % 2 === 0;
        const innerDither = (x + y) % 3 === 0;

        // Distance from center for gradient effect
        const dist = Math.sqrt(cx * cx + headY * headY);

        if (isHead) {
          if (dist < 0.1) {
            ctx.fillStyle = dither ? '#00ffcc' : '#00b894';
          } else {
            ctx.fillStyle = innerDither ? '#00ffcc' : '#00896a';
          }
        } else {
          ctx.fillStyle = dither ? '#00d4aa' : '#006e52';
        }

        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      } else {
        // Scattered background noise
        if (Math.random() < 0.02) {
          ctx.fillStyle = 'rgba(0, 255, 204, 0.08)';
          ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        }
      }
    }
  }
}

// ─────────────────────────────────────────
// 4. Projects Rendering
// ─────────────────────────────────────────
function renderProjects(filter: string = 'all'): void {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;

  const filtered =
    filter === 'all'
      ? projects
      : projects.filter((p) => p.category === filter);

  grid.innerHTML = filtered.map((p) => createProjectCard(p)).join('');

  // Re-observe for scroll animations
  observeRevealElements();
}

function createProjectCard(project: Project): string {
  const tagsHtml = project.tags
    .map((tag) => `<span class="project-card__tag">${tag}</span>`)
    .join('');

  const linkHtml = project.link
    ? `<a href="${project.link}" target="_blank" rel="noopener" class="project-card__link">${project.link}</a>`
    : '';

  return `
    <article class="project-card reveal" data-category="${project.category}">
      <div class="project-card__titlebar">
        <span class="project-card__dot project-card__dot--red"></span>
        <span class="project-card__dot project-card__dot--yellow"></span>
        <span class="project-card__dot project-card__dot--green"></span>
        <span class="project-card__titlebar-text">~/projects/${project.title.toLowerCase().replace(/\s+/g, '-')}</span>
      </div>
      <div class="project-card__body">
        <h3 class="project-card__name">${project.title}</h3>
        <p class="project-card__year">${project.year}</p>
        <div class="project-card__tags">${tagsHtml}</div>
        <p class="project-card__desc">${project.description}</p>
        ${linkHtml}
      </div>
    </article>
  `;
}

function initProjectFilters(): void {
  const buttons = document.querySelectorAll('.projects__side-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = (btn as HTMLElement).dataset.filter || 'all';
      renderProjects(filter);
    });
  });
}

// ─────────────────────────────────────────
// 5. Scroll Handling
// ─────────────────────────────────────────
function initScrollHandlers(): void {
  const threeContainer = document.getElementById('three-container');
  const projectsSideNav = document.getElementById('projects-side-nav');
  const projectsSection = document.getElementById('projects');
  const crtEl = document.querySelector('.crt') as HTMLElement | null;
  const crtBezel = document.querySelector('.crt__bezel') as HTMLElement | null;
  const body = document.body;

  function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const windowHeight = window.innerHeight;
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;

    // ----- Three.js scroll sync -----
    if (threeContainer && retroScene) {
      const containerTop = threeContainer.offsetTop;
      const containerHeight = threeContainer.offsetHeight;
      const scrollRange = containerHeight - windowHeight;
      const progress = (scrollY - containerTop) / scrollRange;
      retroScene.setScrollProgress(progress);

      // Show canvas only when scrolled within the three-container range
      const canvas = threeContainer.querySelector('canvas');
      if (canvas) {
        const inRange = scrollY >= containerTop - windowHeight && scrollY <= containerTop + containerHeight;
        canvas.style.opacity = inRange ? '1' : '0';
      }

      // Update body background to match Three.js background
      const bgColor = retroScene.getBackgroundColor();
      const r = Math.round(bgColor.r * 255);
      const g = Math.round(bgColor.g * 255);
      const b = Math.round(bgColor.b * 255);
      body.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;

      // ----- CRT overlay tracking -----
      if (crtEl) {
        // CRT transform progresses from hero scroll-away into three-container
        // Phase 1: scrollY 0 → containerTop  (hero scrolls, CRT starts shrinking)
        // Phase 2: scrollY containerTop → containerTop+scrollRange (CRT tracks 3D screen)
        const totalRange = containerTop + scrollRange * 0.6;
        const rawT = Math.max(0, Math.min(1, scrollY / totalRange));
        const t = easeInOutCubic(rawT);

        if (rawT <= 0) {
          // No scroll yet — CRT fills viewport
          crtEl.style.transform = 'none';
          crtEl.style.opacity = '1';
          if (crtBezel) crtBezel.style.opacity = '1';
        } else if (rawT < 1) {
          // Get 3D screen rect in viewport coords
          const rect = retroScene.getScreenRect();

          // Calculate scale: from full viewport to screen rect size
          const sx = 1 + (rect.width / viewW - 1) * t;
          const sy = 1 + (rect.height / viewH - 1) * t;

          // Calculate position: from (0,0) to screen rect top-left
          const dx = rect.left * t;
          const dy = rect.top * t;

          crtEl.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
          crtEl.style.opacity = '1';

          // Fade out bezel as CRT shrinks (3D model is the bezel now)
          if (crtBezel) crtBezel.style.opacity = String(Math.max(0, 1 - t * 2));
        } else {
          // Fully transitioned — lock to 3D screen rect
          const rect = retroScene.getScreenRect();
          const sx = rect.width / viewW;
          const sy = rect.height / viewH;
          crtEl.style.transform = `translate(${rect.left}px, ${rect.top}px) scale(${sx}, ${sy})`;

          // Fade out CRT overlay when approaching the end of the scroll range
          const fadeProgress = Math.max(0, (progress - 0.7) / 0.3);
          crtEl.style.opacity = String(Math.max(0, 1 - fadeProgress));
          if (crtBezel) crtBezel.style.opacity = '0';
        }
      }
    }

    // ----- Projects side nav visibility -----
    if (projectsSideNav && projectsSection) {
      const sectionTop = projectsSection.offsetTop;
      const sectionBottom = sectionTop + projectsSection.offsetHeight;
      const inView = scrollY + windowHeight > sectionTop + 100 && scrollY < sectionBottom;
      projectsSideNav.classList.toggle('visible', inView);
    }
  });
}

// ─────────────────────────────────────────
// 6. Scroll Reveal Observer
// ─────────────────────────────────────────
function observeRevealElements(): void {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
  );

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

// ─────────────────────────────────────────
// 7. Interactive Terminal
// ─────────────────────────────────────────
function initTerminal(): void {
  try {
    new Terminal('#crt-terminal');
  } catch (e) {
    console.warn('Terminal failed to initialize:', e);
  }
}

// ─────────────────────────────────────────
// 7b. Typing Animation for CRT Greeting
// ─────────────────────────────────────────
function initTypingEffect(): void {
  const greeting = document.querySelector('.crt__greeting') as HTMLElement;
  const nameEl = document.querySelector('.crt__name') as HTMLElement;

  if (!greeting || !nameEl) return;

  const greetingText = greeting.textContent || '';
  greeting.textContent = '';
  greeting.style.opacity = '1';

  let charIndex = 0;
  const typeInterval = setInterval(() => {
    if (charIndex < greetingText.length) {
      greeting.textContent += greetingText[charIndex];
      charIndex++;
    } else {
      clearInterval(typeInterval);
      setTimeout(() => {
        nameEl.style.opacity = '1';
        nameEl.style.transform = 'translateY(0)';
      }, 200);
    }
  }, 80);

  nameEl.style.opacity = '0';
  nameEl.style.transform = 'translateY(10px)';
  nameEl.style.transition = 'all 0.4s ease';
}

// ─────────────────────────────────────────
// 8. Add reveal classes to static sections
// ─────────────────────────────────────────
function addRevealClasses(): void {
  const selectors = [
    '.about__heading',
    '.about__content',
    '.projects__header',
    '.contact__heading',
    '.contact__text',
  ];
  selectors.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      el.classList.add('reveal');
    });
  });
}

// ─────────────────────────────────────────
// INIT
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initScene();
  initNavigation();
  drawDitheredPortrait();
  renderProjects();
  initProjectFilters();
  addRevealClasses();
  observeRevealElements();
  initScrollHandlers();
  initTypingEffect();
  initTerminal();
});
