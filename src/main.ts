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
// 7. Interactive Terminal on Canvas
// ─────────────────────────────────────────
function initTerminal(): void {
  if (retroScene) {
    try {
      const terminal = new Terminal('#crt-terminal-container', () => {
        // Trigger texture update in scene when terminal rerenders
        retroScene!.updateTexture();
      });
      retroScene.setScreenCanvas(terminal.getCanvas());
    } catch (e) {
      console.warn('Terminal failed to initialize:', e);
    }
  }
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
  renderProjects();
  initProjectFilters();
  addRevealClasses();
  observeRevealElements();
  initScrollHandlers();
  initTerminal();

  // Hide loading screen once all assets/styles are ready,
  // plus a short aesthetic delay to let the user see the terminal text
  window.addEventListener('load', () => {
    setTimeout(() => {
      const loader = document.getElementById('loading-screen');
      const appContent = document.getElementById('app-content');

      if (appContent) {
        appContent.style.opacity = '1';
        appContent.style.visibility = 'visible';
      }

      if (loader) {
        loader.style.opacity = '0';
        loader.style.visibility = 'hidden';
        setTimeout(() => loader.remove(), 600); // Remove from DOM after transition
      }
    }, 400);
  });
});
