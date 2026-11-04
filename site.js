/* Two things only: the group filter, and a lightbox for the figures.
   Without JavaScript the page is the full index and every figure link opens
   the PNG directly, so nothing here is load-bearing. */

(function () {
  "use strict";

  /* ---- colour scheme toggle -------------------------------------------- */

  var root = document.documentElement;
  var toggle = document.getElementById("theme-toggle");

  function prefersDark() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function isDark() {
    var set = root.getAttribute("data-theme");
    return set ? set === "dark" : prefersDark();
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

    toggle.addEventListener("click", function () {
      var next = isDark() ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) { /* ignore */ }
      paintToggle();
    });
  }

  /* ---- group filter ----------------------------------------------------- */

  var buttons = Array.prototype.slice.call(
    document.querySelectorAll(".filters button")
  );
  var sections = Array.prototype.slice.call(
    document.querySelectorAll("section[data-group]")
  );

  function apply(group) {
    sections.forEach(function (section) {
      section.hidden = !(group === "all" || section.dataset.group === group);
    });
    buttons.forEach(function (b) {
      b.setAttribute("aria-pressed", b.dataset.filter === group ? "true" : "false");
    });
  }

  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      apply(button.dataset.filter);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  /* ---- lightbox --------------------------------------------------------- */

  var dialog = document.getElementById("lightbox");
  var img = document.getElementById("lightbox-img");
  var cap = document.getElementById("lightbox-cap");

  if (dialog && typeof dialog.showModal === "function") {
    document.querySelectorAll("a.figure").forEach(function (link) {
      link.addEventListener("click", function (event) {
        if (event.metaKey || event.ctrlKey || event.shiftKey) return;
        event.preventDefault();
        img.src = link.getAttribute("href");
        img.alt = link.querySelector("img").alt;
        cap.textContent = link.dataset.caption || "";
        dialog.showModal();
      });
    });

    /* click anywhere, including the backdrop, closes it */
    dialog.addEventListener("click", function () { dialog.close(); });
    dialog.addEventListener("close", function () { img.src = ""; });
  }
})();
