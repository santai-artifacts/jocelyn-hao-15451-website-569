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

  // ---- PDF preview modal (rendered with PDF.js) ---------------------------
  const pdfLinks = document.querySelectorAll('a.pdf-link[href$=".pdf"]');
  if (pdfLinks.length) {
    const PDFJS_VERSION = '3.11.174';
    const CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;

    // Lazily load PDF.js only when a preview is first opened.
    let libPromise = null;
    const loadLib = () => {
      if (libPromise) return libPromise;
      libPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = `${CDN}/pdf.min.js`;
        s.onload = () => {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${CDN}/pdf.worker.min.js`;
          resolve(window.pdfjsLib);
        };
        s.onerror = () => reject(new Error('Failed to load PDF.js'));
        document.head.appendChild(s);
      });
      return libPromise;
    };

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
            <a class="pdf-modal__btn" data-download href="#">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/></svg>
              <span>Download</span>
            </a>
            <button class="pdf-modal__close" data-close aria-label="Close preview">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        <div class="pdf-modal__doc" tabindex="0"></div>
      </div>`;
    document.body.appendChild(modal);

    const docEl = modal.querySelector('.pdf-modal__doc');
    const titleEl = modal.querySelector('[data-title]');
    const openBtn = modal.querySelector('[data-open]');
    const dlBtn = modal.querySelector('[data-download]');
    let lastFocused = null;
    let blobUrl = null;
    let renderToken = 0; // guards against overlapping opens

    const setStatus = (html) => { docEl.innerHTML = `<div class="pdf-status">${html}</div>`; };
    const clearBlob = () => { if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; } };

    const render = async (href, token) => {
      try {
        const lib = await loadLib();
        if (token !== renderToken) return;
        const resp = await fetch(href);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.arrayBuffer();
        if (token !== renderToken) return;

        // Blob URL powers "Open tab" / "Download" so they preview too.
        clearBlob();
        blobUrl = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
        openBtn.href = blobUrl;
        dlBtn.href = blobUrl;

        // Hand PDF.js a copy so the buffer above stays intact.
        const pdf = await lib.getDocument({ data: data.slice(0) }).promise;
        if (token !== renderToken) return;

        docEl.innerHTML = '';
        const avail = docEl.clientWidth - 32;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        for (let n = 1; n <= pdf.numPages; n++) {
          const page = await pdf.getPage(n);
          if (token !== renderToken) return;
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: Math.min(avail / base.width, 2) });
          const canvas = document.createElement('canvas');
          canvas.className = 'pdf-page';
          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          canvas.style.width = viewport.width + 'px';
          canvas.style.height = viewport.height + 'px';
          const ctx = canvas.getContext('2d');
          ctx.scale(dpr, dpr);
          docEl.appendChild(canvas);
          await page.render({ canvasContext: ctx, viewport }).promise;
        }
      } catch (err) {
        if (token !== renderToken) return;
        openBtn.href = href;
        dlBtn.href = href;
        dlBtn.setAttribute('download', '');
        setStatus(
          `Couldn't render the preview here.<br><a class="pdf-link" href="${href}" target="_blank" rel="noopener" style="margin-top:8px;">Open the PDF in a new tab</a>`
        );
      }
    };

    const open = (href, label) => {
      lastFocused = document.activeElement;
      titleEl.textContent = label || 'Lecture notes';
      dlBtn.removeAttribute('download'); // blob download names itself; raw fallback re-adds it
      setStatus('<div class="pdf-spinner"></div>Loading preview…');
      modal.classList.add('open');
      document.body.classList.add('pdf-open');
      modal.querySelector('[data-close]').focus();
      render(href, ++renderToken);
    };
    const close = () => {
      renderToken++; // cancel any in-flight render
      modal.classList.remove('open');
      document.body.classList.remove('pdf-open');
      docEl.innerHTML = '';
      clearBlob();
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
