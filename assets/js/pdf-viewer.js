'use strict';

/**
 * In-page PDF viewer for portfolio projects.
 * Project links carry data-pdf; clicking one opens the PDF in a modal and renders
 * its pages with PDF.js (loaded from cdnjs on first use). Pages render lazily as they
 * scroll into view. Ctrl/Cmd-click still opens the standalone project page in a new tab.
 */

(function () {

  const PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  const WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  const modal = document.querySelector('[data-pdf-modal]');
  if (!modal) return;

  const panel = modal.querySelector('.pdf-modal-panel');
  const titleEl = modal.querySelector('[data-pdf-title]');
  const bodyEl = modal.querySelector('[data-pdf-body]');
  const statusEl = modal.querySelector('[data-pdf-status]');
  const newTabEl = modal.querySelector('[data-pdf-newtab]');

  const isZh = function () { return document.documentElement.lang.indexOf('zh') === 0; };

  let pdfjsPromise = null;
  let currentDoc = null;
  let observer = null;
  let openToken = 0;
  let lastFocus = null;

  const loadPdfjs = function () {
    if (pdfjsPromise) return pdfjsPromise;
    pdfjsPromise = new Promise(function (resolve, reject) {
      const s = document.createElement('script');
      s.src = PDFJS_URL;
      s.onload = function () {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;
        resolve(window.pdfjsLib);
      };
      s.onerror = function () { pdfjsPromise = null; reject(new Error('PDF.js failed to load')); };
      document.head.appendChild(s);
    });
    return pdfjsPromise;
  };

  const setStatus = function (text) {
    statusEl.textContent = text;
    statusEl.hidden = !text;
  };

  const clearPages = function () {
    if (observer) { observer.disconnect(); observer = null; }
    bodyEl.querySelectorAll('.pdf-page').forEach(function (el) { el.remove(); });
    if (currentDoc) { currentDoc.destroy(); currentDoc = null; }
  };

  const renderPage = function (doc, pageNum, holder) {
    holder.dataset.rendered = 'true';
    return doc.getPage(pageNum).then(function (page) {
      const width = holder.clientWidth;
      const base = page.getViewport({ scale: 1 });
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: (width / base.width) * ratio });

      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      holder.appendChild(canvas);

      return page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;
    }).then(function () {
      holder.classList.add('loaded');
    });
  };

  const open = function (src, title, pageUrl) {
    const token = ++openToken;

    lastFocus = document.activeElement;
    titleEl.textContent = title;
    newTabEl.href = pageUrl || src;
    clearPages();
    setStatus(isZh() ? '加载中…' : 'Loading…');

    modal.hidden = false;
    document.body.classList.add('pdf-modal-open');
    alignToContent();
    bodyEl.scrollTop = 0;
    requestAnimationFrame(function () { modal.classList.add('active'); });
    modal.querySelector('.pdf-modal-close').focus();

    loadPdfjs()
      .then(function (pdfjsLib) { return pdfjsLib.getDocument(src).promise; })
      .then(function (doc) {
        if (token !== openToken) { doc.destroy(); return; }
        currentDoc = doc;
        setStatus('');

        // reserve each page's space from page 1's aspect ratio, then render on approach
        return doc.getPage(1).then(function (first) {
          const vp = first.getViewport({ scale: 1 });
          const aspect = vp.width + ' / ' + vp.height;

          observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
              const holder = entry.target;
              if (entry.isIntersecting && !holder.dataset.rendered) {
                renderPage(doc, Number(holder.dataset.page), holder).catch(function () { });
              }
            });
          }, { root: bodyEl, rootMargin: '600px 0px' });

          for (let i = 1; i <= doc.numPages; i++) {
            const holder = document.createElement('div');
            holder.className = 'pdf-page';
            holder.dataset.page = i;
            holder.style.aspectRatio = aspect;
            bodyEl.appendChild(holder);
            observer.observe(holder);
          }
        });
      })
      .catch(function () {
        if (token !== openToken) return;
        setStatus(isZh() ? '加载失败，请点右上角在新标签页打开。' : 'Could not load the PDF. Try opening it in a new tab.');
      });
  };

  // span the site's layout: from the sidebar's left edge to the main content box's right edge
  // (the two columns side by side on desktop, or the single stacked column on small screens),
  // starting at their top edge (or near the top of the screen once scrolled)
  const GAP = 12;
  const alignToContent = function () {
    const boxes = [document.querySelector('.sidebar'), document.querySelector('.main-content article.active')]
      .filter(Boolean)
      .map(function (el) { return el.getBoundingClientRect(); });
    if (!boxes.length) return;
    const left = Math.min.apply(null, boxes.map(function (r) { return r.left; }));
    const right = Math.max.apply(null, boxes.map(function (r) { return r.right; }));
    const top = Math.min.apply(null, boxes.map(function (r) { return r.top; }));
    panel.style.left = left + 'px';
    panel.style.width = (right - left) + 'px';
    panel.style.top = Math.max(GAP, top) + 'px';
    panel.style.bottom = GAP + 'px';
  };

  window.addEventListener('resize', function () {
    if (!modal.hidden) alignToContent();
  });

  const close = function () {
    openToken++;
    modal.classList.remove('active');
    document.body.classList.remove('pdf-modal-open');
    setTimeout(function () {
      if (!modal.classList.contains('active')) {
        modal.hidden = true;
        clearPages();
      }
    }, 250);
    if (lastFocus) lastFocus.focus();
  };

  // project links open the viewer (modifier clicks keep the normal new-tab behavior)
  document.querySelectorAll('a[data-pdf]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      const title = (link.querySelector('.project-title') || link).textContent.trim();
      open(link.dataset.pdf, title, link.getAttribute('href'));
    });
  });

  modal.querySelectorAll('[data-pdf-close]').forEach(function (el) {
    el.addEventListener('click', close);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.hidden) close();
  });

})();
