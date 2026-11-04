/* Colour scheme, group filter, scroll reveal, progress bar, figure lightbox.

   All of it is enhancement. With JavaScript off the page is the complete
   index, every card is visible, and every figure link opens the PNG. With
   prefers-reduced-motion on, the CSS flattens the motion and this file stops
   animating too. */

(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* elements waiting to be revealed; declared here because the progress bar
     paints once on start-up and sweeps this queue in the same frame */
  var pending = [];

  /* ---- colour scheme toggle -------------------------------------------- */

  var root = document.documentElement;
  var toggle = document.getElementById("theme-toggle");
  var darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

  function isDark() {
    var set = root.getAttribute("data-theme");
    return set ? set === "dark" : darkQuery.matches;
  }

  function paintToggle() {
    toggle.textContent = isDark() ? "Light mode" : "Dark mode";
    toggle.setAttribute("aria-pressed", isDark() ? "true" : "false");
  }

  if (toggle) {
    try {
      var saved = localStorage.getItem("theme");
      if (saved === "dark" || saved === "light") root.setAttribute("data-theme", saved);
    } catch (e) { /* private mode, blocked storage: the media query still works */ }

    toggle.hidden = false;
    paintToggle();

    /* the system scheme can change while the page is open; if the visitor has
       not chosen one explicitly, follow it */
    darkQuery.addEventListener("change", paintToggle);

    toggle.addEventListener("click", function () {
      var next = isDark() ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) { /* ignore */ }
      paintToggle();
    });
  }

  /* ---- scroll progress -------------------------------------------------- */

  var bar = document.querySelector("#progress span");

  if (bar) {
    var frame = 0;

    function paintBar() {
      frame = 0;
      sweepReveals();
      var doc = document.documentElement;
      var max = doc.scrollHeight - doc.clientHeight;
      var frac = max > 0 ? Math.min(1, doc.scrollTop / max) : 0;
      bar.style.width = (frac * 100).toFixed(2) + "%";
    }

    /* coalesce to one paint per frame by replacing the pending request, not
       by latching a flag — a flag never cleared in a backgrounded tab, where
       requestAnimationFrame does not fire, would freeze the bar for good */
    function schedule() {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(paintBar);
    }

    window.addEventListener("scroll", schedule, { passive: true });
    document.addEventListener("visibilitychange", paintBar);

    window.addEventListener("resize", paintBar, { passive: true });
    paintBar();
  }

  /* ---- scroll reveal ---------------------------------------------------- */

  /* Deliberately NOT an IntersectionObserver. A flick-scroll can carry an
     element through the viewport between two observer callbacks, and a card
     that is never reported is a card that never becomes visible again. A
     sweep driven by the scroll frame cannot skip anything: it asks where
     elements are now, not where they were when an entry was queued. */

  var revealTargets = Array.prototype.slice.call(
    document.querySelectorAll("article.card, section[data-group] > .wrap > h2, .section-note")
  );

  function sweepReveals() {
    if (!pending.length) return;
    var edge = window.innerHeight * 1.02;
    var still = [];

    pending.forEach(function (el) {
      if (el.getBoundingClientRect().top >= edge) { still.push(el); return; }
      var delay = Number(el.dataset.revealDelay) || 0;
      if (delay) {
        window.setTimeout(function () { el.classList.add("shown"); }, delay);
      } else {
        el.classList.add("shown");
      }
    });

    pending = still;
  }

  function revealNow(scope) {
    scope.querySelectorAll(".reveal").forEach(function (el) {
      el.classList.add("shown");
    });
    pending = pending.filter(function (el) { return !el.classList.contains("shown"); });
  }

  if (!reduced.matches) {
    revealTargets.forEach(function (el, i) {
      el.classList.add("reveal");
      /* a pair of cards in one row arrives together, not in a queue */
      el.dataset.revealDelay = String((i % 2) * 70);
      pending.push(el);
    });
    sweepReveals();
    window.addEventListener("load", sweepReveals);
  }

  /* ---- group filter ----------------------------------------------------- */

  var buttons = Array.prototype.slice.call(
    document.querySelectorAll(".filters button")
  );
  var sections = Array.prototype.slice.call(
    document.querySelectorAll("section[data-group]")
  );

  function apply(group) {
    buttons.forEach(function (b) {
      b.setAttribute("aria-pressed", b.dataset.filter === group ? "true" : "false");
    });

    sections.forEach(function (section) {
      var wanted = group === "all" || section.dataset.group === group;

      if (reduced.matches) {
        section.hidden = !wanted;
        if (wanted) revealNow(section);
        return;
      }

      if (!wanted) {
        /* fade out, then take it out of the flow */
        section.classList.add("fading");
        window.setTimeout(function () {
          if (section.classList.contains("fading")) section.hidden = true;
        }, 250);
        return;
      }

      section.classList.remove("fading");
      if (section.hidden) {
        section.hidden = false;
        /* a section coming back has already been scrolled past, so its cards
           would never re-trigger the observer: show them outright */
        revealNow(section);
      }
    });
  }

  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      apply(button.dataset.filter);
      window.scrollTo({
        top: 0,
        behavior: reduced.matches ? "auto" : "smooth"
      });
    });
  });

  /* ---- lightbox --------------------------------------------------------- */

  var dialog = document.getElementById("lightbox");
  var img = document.getElementById("lightbox-img");
  var cap = document.getElementById("lightbox-cap");
  var count = document.getElementById("lightbox-count");
  var prevBtn = document.getElementById("lightbox-prev");
  var nextBtn = document.getElementById("lightbox-next");

  if (dialog && typeof dialog.showModal === "function") {
    var links = Array.prototype.slice.call(document.querySelectorAll("a.figure"));
    var at = 0;

    /* only the figures currently on screen are worth arrowing through */
    function visibleLinks() {
      return links.filter(function (l) {
        return !l.closest("section[data-group]").hidden;
      });
    }

    var reel = [];

    function show(i) {
      if (!reel.length) return;
      at = (i + reel.length) % reel.length;
      var link = reel[at];
      img.src = link.getAttribute("href");
      img.alt = link.querySelector("img").alt;
      cap.textContent = link.dataset.caption || "";
      count.textContent = (at + 1) + " / " + reel.length;
    }

    links.forEach(function (link) {
      link.addEventListener("click", function (event) {
        if (event.metaKey || event.ctrlKey || event.shiftKey) return;
        /* on a phone the dialog is no wider than the card, so let the browser
           open the PNG itself — pinch-zoom is the better magnifier there */
        if (window.innerWidth < 640) return;
        event.preventDefault();
        reel = visibleLinks();
        show(reel.indexOf(link));
        dialog.showModal();
      });
    });

    function step(by) { show(at + by); }

    prevBtn.addEventListener("click", function (e) { e.stopPropagation(); step(-1); });
    nextBtn.addEventListener("click", function (e) { e.stopPropagation(); step(1); });

    document.addEventListener("keydown", function (event) {
      if (!dialog.open) return;
      if (event.key === "ArrowRight") { event.preventDefault(); step(1); }
      if (event.key === "ArrowLeft")  { event.preventDefault(); step(-1); }
    });

    /* click the image or the backdrop to close; the controls stop propagation */
    dialog.addEventListener("click", function () { dialog.close(); });
    dialog.addEventListener("close", function () { img.src = ""; });
  }
})();
