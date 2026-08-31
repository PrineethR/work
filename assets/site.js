/* Progressive enhancement + In-memory Passcode Gate */
(function () {
  var PASSCODE = '290796';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Passcode Gate ---- */
  function initGate() {
    if (window.__portfolioUnlocked) {
      document.documentElement.classList.add('unlocked');
      var existingGate = document.getElementById('gate');
      if (existingGate) existingGate.style.display = 'none';
      return;
    }

    var gate = document.getElementById('gate');
    if (!gate) {
      gate = document.createElement('div');
      gate.id = 'gate';
      gate.className = 'gate';
      gate.setAttribute('role', 'dialog');
      gate.setAttribute('aria-modal', 'true');
      gate.setAttribute('aria-label', 'Passcode required');
      gate.innerHTML =
        '<div class="gate__card">' +
          '<p class="gate__author">Prineeth Ramachandra</p>' +
          '<p class="gate__subtitle mono">Portfolio Preview</p>' +
          '<form id="gate-form" class="gate__form" autocomplete="off">' +
            '<div class="gate__field">' +
              '<input id="gate-pass" class="gate__input mono" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="••••••" aria-label="Enter passcode" autofocus required />' +
              '<button class="gate__submit" type="submit" aria-label="Unlock portfolio"><span class="mono">Enter &rarr;</span></button>' +
            '</div>' +
            '<p id="gate-error" class="gate__error mono" aria-live="polite"></p>' +
          '</form>' +
          '<p class="gate__hint mono">Private preview &#183; Bengaluru</p>' +
        '</div>';
      document.body.prepend(gate);
    }

    var form = document.getElementById('gate-form');
    var input = document.getElementById('gate-pass');
    var error = document.getElementById('gate-error');

    if (input) {
      setTimeout(function () { input.focus(); }, 50);
    }

    function unlock() {
      window.__portfolioUnlocked = true;
      document.documentElement.classList.add('unlocked');
      if (error) error.textContent = '';
      if (input) input.value = '';
      setTimeout(function () {
        if (gate && gate.parentNode) {
          gate.setAttribute('aria-hidden', 'true');
        }
      }, 450);
      initPage();
    }

    function triggerError() {
      if (error) error.textContent = 'Incorrect passcode';
      if (input) {
        input.classList.remove('is-invalid');
        void input.offsetWidth; /* force reflow */
        input.classList.add('is-invalid');
        input.value = '';
        input.focus();
      }
    }

    if (input) {
      input.addEventListener('input', function () {
        if (error) error.textContent = '';
        input.classList.remove('is-invalid');
        if (input.value.trim() === PASSCODE) {
          unlock();
        }
      });
    }

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var val = input ? input.value.trim() : '';
        if (val === PASSCODE) {
          unlock();
        } else {
          triggerError();
        }
      });
    }
  }

  /* ---- Page Functionality ---- */
  var scrollCleanup = null;

  function initPage() {
    if (scrollCleanup) {
      scrollCleanup();
      scrollCleanup = null;
    }

    /* ---- collapsible index (small screens) ---- */
    var nav = document.querySelector('.index');
    var toggle = nav && nav.querySelector('.index__toggle');
    if (toggle) {
      var sync = function () {
        var narrow = matchMedia('(max-width: 900px)').matches;
        var open = narrow ? nav.dataset.open === 'true' : true;
        toggle.setAttribute('aria-expanded', String(open));
        toggle.hidden = !narrow;
      };
      toggle.addEventListener('click', function () {
        nav.dataset.open = nav.dataset.open === 'true' ? 'false' : 'true';
        sync();
      });
      matchMedia('(max-width: 900px)').addEventListener('change', sync);
      sync();
    }

    /* ---- parallel read ---- */
    var essay = document.querySelector('.essay');
    var plates = [].slice.call(document.querySelectorAll('.plate'));

    if (plates.length && essay) {
      essay.setAttribute('data-live', '');
      var counter = document.querySelector('.index__counter b');
      var paras = [].slice.call(essay.querySelectorAll('p[data-cue]'));
      var current = null;
      var handled = 0; /* last time reader scrolled essay */

      var onEssayInteract = function () { handled = Date.now(); };
      ['wheel', 'pointerdown', 'keydown'].forEach(function (ev) {
        essay.addEventListener(ev, onEssayInteract, { passive: true });
      });

      function columnMode() { return getComputedStyle(essay).position === 'sticky'; }

      function apply(n) {
        if (n === current) return;
        current = n;
        plates.forEach(function (p) { p.dataset.cued = String(p.dataset.cue === n); });
        var target = null;
        paras.forEach(function (p) {
          var on = p.dataset.cue === n;
          p.dataset.cued = String(on);
          if (on) target = p;
        });
        if (counter) counter.textContent = n;
        if (target && columnMode() && Date.now() - handled > 3500) {
          var delta = target.getBoundingClientRect().top - essay.getBoundingClientRect().top;
          essay.scrollTo({ top: Math.max(0, essay.scrollTop + delta - 8),
                           behavior: reduce ? 'auto' : 'smooth' });
        }
      }

      function measure() {
        var line = innerHeight * 0.42;
        var pick = null, nearest = Infinity;
        for (var i = 0; i < plates.length; i++) {
          var r = plates[i].getBoundingClientRect();
          if (r.top <= line && r.bottom >= line) { pick = plates[i]; break; }
          var d = r.top > line ? r.top - line : line - r.bottom;
          if (d < nearest) { nearest = d; pick = plates[i]; }
        }
        if (pick) apply(pick.dataset.cue);
      }

      var queued = false;
      function onScroll() {
        if (queued) return;
        queued = true;
        requestAnimationFrame(function () { queued = false; measure(); });
      }
      addEventListener('scroll', onScroll, { passive: true });
      addEventListener('resize', onScroll);
      measure();

      scrollCleanup = function () {
        removeEventListener('scroll', onScroll);
        removeEventListener('resize', onScroll);
      };
    }

    /* ---- jumps, with focus carried to destination ---- */
    function goto(sel) {
      var t = document.querySelector(sel);
      if (!t) return;
      t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      t.focus({ preventScroll: true });
    }
    document.querySelectorAll('.cue').forEach(function (b) {
      b.addEventListener('click', function () { goto('.plate[data-cue="' + b.dataset.cue + '"]'); });
    });
    document.querySelectorAll('.plate__note').forEach(function (b) {
      b.addEventListener('click', function () { goto('.essay p[data-cue="' + b.dataset.cue + '"]'); });
    });

    /* ---- documentation clips ---- */
    document.querySelectorAll('.plate__video').forEach(function (v) {
      var frame = v.closest('.plate__frame');
      var btn = frame && frame.querySelector('.plate__playtoggle');
      var loaded = false;
      function ensureLoaded() {
        if (loaded) return;
        loaded = true;
        v.preload = 'auto';
        v.load();
      }
      if (btn) {
        btn.addEventListener('click', function () {
          if (v.paused) { ensureLoaded(); v.play().catch(function () {}); }
          else v.pause();
        });
      }
      v.addEventListener('play', function () {
        if (btn) { btn.textContent = 'Pause'; btn.setAttribute('aria-pressed', 'true'); }
      });
      v.addEventListener('pause', function () {
        if (btn) { btn.textContent = 'Play'; btn.setAttribute('aria-pressed', 'false'); }
      });

      if (!reduce && 'IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (es) {
          es.forEach(function (e) {
            if (e.isIntersecting) { ensureLoaded(); v.play().catch(function () {}); }
            else v.pause();
          });
        }, { threshold: 0.4 });
        io.observe(v);
      }
    });

    /* ---- lightbox ---- */
    var figs = [].slice.call(document.querySelectorAll('.plate__frame img'));
    var existingLb = document.querySelector('.lb');
    if (existingLb) existingLb.remove();

    if (figs.length) {
      var lb = document.createElement('div');
      lb.className = 'lb';
      lb.hidden = true;
      lb.setAttribute('role', 'dialog');
      lb.setAttribute('aria-modal', 'true');
      lb.setAttribute('aria-label', 'Enlarged plate');
      lb.innerHTML = '<img alt=""><p class="lb__cap mono"><span></span>' +
        '<button class="lb__close" type="button">Close (esc)</button></p>';
      document.body.appendChild(lb);
      var lbImg = lb.querySelector('img');
      var lbCap = lb.querySelector('.lb__cap span');
      var lbClose = lb.querySelector('.lb__close');
      var opener = null;

      function openLb(img) {
        var fig = img.closest('.plate');
        opener = img;
        lbImg.src = img.currentSrc || img.src;
        lbImg.alt = img.alt;
        lbCap.textContent = fig ? fig.querySelector('.plate__text').textContent.trim() : '';
        lb.hidden = false;
        document.body.style.overflow = 'hidden';
        lbClose.focus();
      }
      function closeLb() {
        lb.hidden = true;
        document.body.style.overflow = '';
        if (opener) opener.focus();
      }
      figs.forEach(function (img) {
        img.tabIndex = 0;
        img.setAttribute('role', 'button');
        img.setAttribute('aria-label', 'Enlarge: ' + img.alt);
        img.addEventListener('click', function () { openLb(img); });
        img.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLb(img); }
        });
      });
      lbClose.addEventListener('click', closeLb);
      lb.addEventListener('click', function (e) { if (e.target === lb || e.target === lbImg) closeLb(); });
      document.addEventListener('keydown', function (e) {
        if (lb.hidden) return;
        if (e.key === 'Escape') closeLb();
        if (e.key === 'Tab') { e.preventDefault(); lbClose.focus(); }
      });
    }

    /* ---- index preview ---- */
    var pv = document.querySelector('.preview');
    if (pv) {
      var pImg = pv.querySelector('img');
      var pCap = pv.querySelector('.preview__cap');
      document.querySelectorAll('.worklist li').forEach(function (li) {
        function show() {
          if (!li.dataset.img) return;
          pImg.src = li.dataset.img;
          pCap.innerHTML = '<b>' + li.dataset.title + '</b>' + li.dataset.meta;
        }
        li.addEventListener('mouseenter', show);
        li.addEventListener('focusin', show);
      });
    }

    attachLinkInterceptors();
  }

  /* ---- Seamless in-tab browsing (PJAX Router) ---- */
  function navigateTo(url, push) {
    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('Network error');
        return res.text();
      })
      .then(function (html) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');

        var newTitle = doc.querySelector('title');
        if (newTitle) document.title = newTitle.textContent;

        var newShell = doc.querySelector('.shell');
        var currentShell = document.querySelector('.shell');
        if (newShell && currentShell) {
          currentShell.replaceWith(newShell);
        }

        if (push) {
          history.pushState({ url: url }, '', url);
        }

        window.scrollTo(0, 0);
        initPage();
      })
      .catch(function () {
        window.location.href = url;
      });
  }

  function attachLinkInterceptors() {
    document.querySelectorAll('a[href]').forEach(function (a) {
      if (a.__intercepted) return;
      a.__intercepted = true;

      a.addEventListener('click', function (e) {
        var href = a.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.endsWith('.pdf') || href.startsWith('http://') || href.startsWith('https://')) {
          return;
        }

        if (window.__portfolioUnlocked) {
          e.preventDefault();
          navigateTo(href, true);
        }
      });
    });
  }

  window.addEventListener('popstate', function () {
    if (window.__portfolioUnlocked) {
      navigateTo(location.pathname + location.search + location.hash, false);
    }
  });

  /* Initial mount */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initGate();
      if (window.__portfolioUnlocked) initPage();
    });
  } else {
    initGate();
    if (window.__portfolioUnlocked) initPage();
  }
})();
