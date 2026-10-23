(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // Footer year
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  // ------------------------------------------------------------------
  // Theme toggle (initial theme is set inline in <head> to avoid a flash)
  // ------------------------------------------------------------------
  var themeToggle = document.querySelector(".theme-toggle");

  function currentTheme() {
    return root.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function syncThemeUI() {
    var dark = currentTheme() === "dark";
    if (themeToggle) themeToggle.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) {
      m.setAttribute("content", dark ? "#13110E" : "#F4EEE3");
    });
  }

  function applyTheme(theme, save) {
    root.setAttribute("data-theme", theme);
    if (save) {
      try { localStorage.setItem("theme", theme); } catch (e) {}
    }
    syncThemeUI();
  }

  syncThemeUI();

  if (themeToggle) {
    themeToggle.addEventListener("click", function (e) {
      var next = currentTheme() === "dark" ? "light" : "dark";
      if (!document.startViewTransition || reduceMotion) {
        applyTheme(next, true);
        return;
      }
      // Circular reveal from the button
      var rect = themeToggle.getBoundingClientRect();
      var x = rect.left + rect.width / 2;
      var y = rect.top + rect.height / 2;
      var r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      var transition = document.startViewTransition(function () { applyTheme(next, true); });
      transition.ready.then(function () {
        root.animate(
          { clipPath: ["circle(0px at " + x + "px " + y + "px)", "circle(" + r + "px at " + x + "px " + y + "px)"] },
          { duration: 550, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)", pseudoElement: "::view-transition-new(root)" }
        );
      });
    });
  }

  // Follow the OS setting until the visitor picks a theme themselves
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function (e) {
    var saved = null;
    try { saved = localStorage.getItem("theme"); } catch (err) {}
    if (!saved) applyTheme(e.matches ? "dark" : "light", false);
  });

  // ------------------------------------------------------------------
  // Mobile nav
  // ------------------------------------------------------------------
  var toggle = document.querySelector(".nav-toggle");
  var links = document.getElementById("nav-links");

  function setNav(open) {
    toggle.setAttribute("aria-expanded", String(open));
    links.classList.toggle("open", open);
  }

  if (toggle && links) {
    toggle.addEventListener("click", function () {
      setNav(toggle.getAttribute("aria-expanded") !== "true");
    });
    links.addEventListener("click", function (e) {
      if (e.target.tagName === "A") setNav(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && links.classList.contains("open")) {
        setNav(false);
        toggle.focus();
      }
    });
  }

  // ------------------------------------------------------------------
  // Scroll: progress bar, hide-on-scroll header, back-to-top, parallax
  // ------------------------------------------------------------------
  var header = document.querySelector(".site-header");
  var toTop = document.querySelector(".to-top");
  var hero = document.querySelector(".hero");
  var heroImg = document.querySelector(".hero-photo img");
  var timeline = document.querySelector(".timeline");
  var lastY = window.scrollY;
  var ticking = false;

  function onScroll() {
    var y = window.scrollY;
    var max = document.documentElement.scrollHeight - innerHeight;
    var progress = max > 0 ? Math.min(y / max, 1) : 0;
    root.style.setProperty("--progress", progress.toFixed(4));

    if (header) {
      header.classList.toggle("scrolled", y > 8);
      var navOpen = links && links.classList.contains("open");
      var goingDown = y > lastY + 4;
      var goingUp = y < lastY - 4;
      if (goingDown && y > 320 && !navOpen) header.classList.add("hidden");
      else if (goingUp || y < 320) header.classList.remove("hidden");
    }

    if (toTop) toTop.classList.toggle("show", y > innerHeight * 0.9);
    if (hero) hero.classList.toggle("scrolled-past", y > 40);

    if (!reduceMotion && heroImg && y < innerHeight * 1.2) {
      heroImg.style.setProperty("--parallax", (y * 0.06).toFixed(1) + "px");
    }

    if (timeline) {
      var r = timeline.getBoundingClientRect();
      var start = innerHeight * 0.6;
      var fill = Math.min(Math.max((start - r.top) / r.height, 0), 1);
      timeline.style.setProperty("--fill", fill.toFixed(3));
      timeline.querySelectorAll("li").forEach(function (li) {
        li.classList.toggle("passed", li.getBoundingClientRect().top < start);
      });
    }

    lastY = y;
    ticking = false;
  }

  window.addEventListener("scroll", function () {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onScroll);
    }
  }, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  onScroll();

  // Show the header again when keyboard focus lands in it
  if (header) header.addEventListener("focusin", function () { header.classList.remove("hidden"); });

  if (toTop) {
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      var brand = document.querySelector(".brand");
      if (brand) brand.focus({ preventScroll: true });
    });
  }

  // ------------------------------------------------------------------
  // Typed tagline in the hero
  // ------------------------------------------------------------------
  var typed = document.querySelector(".typed[data-phrases]");
  if (typed && !reduceMotion) {
    var phrases = typed.getAttribute("data-phrases").split("|");
    var p = 0, c = phrases[0].length, deleting = true;
    var tick = function () {
      if (deleting) {
        c--;
        if (c <= 0) { deleting = false; p = (p + 1) % phrases.length; }
      } else {
        c++;
      }
      typed.textContent = phrases[p].slice(0, Math.max(c, 0));
      var delay = deleting ? 28 : 55;
      if (!deleting && c >= phrases[p].length) { deleting = true; delay = 2400; }
      setTimeout(tick, delay);
    };
    setTimeout(tick, 3200);
  }

  // ------------------------------------------------------------------
  // Count-up numbers
  // ------------------------------------------------------------------
  function countUp(el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    if (reduceMotion || !target) return;
    var t0 = null, dur = 1200;
    var step = function (t) {
      if (!t0) t0 = t;
      var k = Math.min((t - t0) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    el.textContent = "0";
    requestAnimationFrame(step);
  }

  // ------------------------------------------------------------------
  // Reveal on scroll, staggered within groups
  // ------------------------------------------------------------------
  var groups = ".principles, .cards, .skill-groups, .timeline, .glance, .contact-list, .deliverables";
  document.querySelectorAll(groups).forEach(function (group) {
    var items = group.querySelectorAll(".reveal");
    items.forEach(function (el, i) { el.style.setProperty("--d", Math.min(i, 6) * 90 + "ms"); });
  });

  var watched = document.querySelectorAll(".reveal, .reveal-head, .code-card, [data-count]");
  if (!("IntersectionObserver" in window)) {
    watched.forEach(function (el) { el.classList.add("in"); });
  } else {
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.classList.add("in");
        if (el.hasAttribute("data-count")) countUp(el);
        revealer.unobserve(el);
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.1 });
    watched.forEach(function (el) { revealer.observe(el); });

    // Highlight the nav link for the section in view
    var navLinks = document.querySelectorAll(".nav-links a[href^='#']");
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) {
          a.classList.toggle("active", a.getAttribute("href") === "#" + entry.target.id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    navLinks.forEach(function (a) {
      var section = document.querySelector(a.getAttribute("href"));
      if (section) spy.observe(section);
    });
  }

  // ------------------------------------------------------------------
  // Pointer effects: card spotlight and hero photo tilt
  // ------------------------------------------------------------------
  if (finePointer) {
    document.querySelectorAll(".spotlight").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", e.clientX - r.left + "px");
        card.style.setProperty("--my", e.clientY - r.top + "px");
      });
    });

    var photo = document.querySelector(".hero-photo");
    var inner = document.querySelector(".hero-photo-inner");
    if (photo && inner && !reduceMotion) {
      photo.addEventListener("pointermove", function (e) {
        var r = photo.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        inner.style.transform = "rotateY(" + (px * 6).toFixed(2) + "deg) rotateX(" + (-py * 6).toFixed(2) + "deg)";
      });
      photo.addEventListener("pointerleave", function () { inner.style.transform = ""; });
    }
  }

  // ------------------------------------------------------------------
  // Copy email + toast
  // ------------------------------------------------------------------
  var toast = document.querySelector(".toast");
  var toastTimer;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 2200);
  }

  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      var done = function () {
        btn.classList.add("copied");
        showToast("Email address copied");
        setTimeout(function () { btn.classList.remove("copied"); }, 2000);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, function () { showToast(text); });
      } else {
        showToast(text);
      }
    });
  });
})();
