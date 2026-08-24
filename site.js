// Mobile nav toggle + scroll-reveal
(function () {
  const toggle = document.querySelector('.nav__toggle');
  const links = document.querySelector('.nav__links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
    });
    links.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => links.classList.remove('open'))
    );
  }

  // ---- PDF preview modal --------------------------------------------------
  const pdfLinks = document.querySelectorAll('a.pdf-link[href$=".pdf"]');
  if (pdfLinks.length) {
    const modal = document.createElement('div');
    modal.className = 'pdf-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Lecture notes preview');
    modal.innerHTML = `
      <div class="pdf-modal__panel">
        <div class="pdf-modal__bar">
          <div class="pdf-modal__title"><small>Lecture Notes</small><span data-title></span></div>
          <div class="pdf-modal__actions">
            <a class="pdf-modal__btn" data-open target="_blank" rel="noopener" href="#">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14 21 3"/></svg>
              <span>Open tab</span>
            </a>
            <a class="pdf-modal__btn" data-download download href="#">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/></svg>
              <span>Download</span>
            </a>
            <button class="pdf-modal__close" data-close aria-label="Close preview">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        <iframe class="pdf-modal__frame" title="Lecture notes PDF"></iframe>
      </div>`;
    document.body.appendChild(modal);

    const frame = modal.querySelector('.pdf-modal__frame');
    const titleEl = modal.querySelector('[data-title]');
    const openBtn = modal.querySelector('[data-open]');
    const dlBtn = modal.querySelector('[data-download]');
    let lastFocused = null;

    const open = (href, label) => {
      lastFocused = document.activeElement;
      titleEl.textContent = label || 'Lecture notes';
      openBtn.href = href;
      dlBtn.href = href;
      frame.src = href + '#view=FitH';
      modal.classList.add('open');
      document.body.classList.add('pdf-open');
      modal.querySelector('[data-close]').focus();
    };
    const close = () => {
      modal.classList.remove('open');
      document.body.classList.remove('pdf-open');
      frame.src = 'about:blank';
      if (lastFocused) lastFocused.focus();
    };

    pdfLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        // let modified clicks (new tab, etc.) behave normally
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        const row = link.closest('tr');
        const topic = row && row.querySelector('.lec-topic');
        open(link.getAttribute('href'), topic ? topic.textContent.trim() : 'Lecture notes');
      });
    });

    modal.addEventListener('click', (e) => { if (e.target === modal || e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('open')) close(); });
  }

  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('in'));
  }
})();
