/*
 * LunaStream - TV / D-pad spatial navigation
 *
 * Makes the web UI usable with a TV remote: arrow keys move focus between
 * the nearest focusable element (buttons, links, cards), Enter activates.
 * Enabled automatically only on TV-class devices (user-agent detection), so
 * desktop/phone behaviour is unchanged.
 */
(function () {
  'use strict';

  var TV_UA = /TV|SmartTV|BRAVIA|AFT|FireTV|CrKey|GoogleTV|Android TV|AppleTV|Tizen|Web0S|WebOS/i;
  if (!TV_UA.test(navigator.userAgent)) return;

  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function interactives() {
    return Array.prototype.filter.call(
      document.querySelectorAll(FOCUSABLE),
      function (el) {
        var r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) return false;
        var s = getComputedStyle(el);
        return s.visibility !== 'hidden' && s.display !== 'none' && s.pointerEvents !== 'none';
      }
    );
  }

  function center(el) {
    var r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, rect: r };
  }

  // Simple geometric "nearest in direction" heuristic
  function pick(direction) {
    var active = document.activeElement;
    var list = interactives();
    if (!list.length) return null;

    if (!active || active === document.body || !active.matches(FOCUSABLE) ||
        list.indexOf(active) === -1) {
      // No focus yet - start with the element closest to the viewport center
      var cx = window.innerWidth / 2, cy = window.innerHeight / 2;
      var best = null, bestD = Infinity;
      list.forEach(function (el) {
        var c = center(el);
        var d = (c.x - cx) * (c.x - cx) + (c.y - cy) * (c.y - cy);
        if (d < bestD) { bestD = d; best = el; }
      });
      return best;
    }

    var from = center(active);
    var fx = from.x, fy = from.y, fr = from.rect;
    var cand = null, candScore = Infinity;

    list.forEach(function (el) {
      if (el === active) return;
      var c = center(el);
      var dx = c.x - fx, dy = c.y - fy;
      var overlapX = Math.min(fr.right, c.rect.right) - Math.max(fr.left, c.rect.left);
      var overlapY = Math.min(fr.bottom, c.rect.bottom) - Math.max(fr.top, c.rect.top);

      var forward = false, primary = 0, cross = 0;
      if (direction === 'left'  && dx < 0) { forward = true; primary = -dx; cross = Math.abs(dy) - Math.max(0, overlapY); }
      if (direction === 'right' && dx > 0) { forward = true; primary =  dx; cross = Math.abs(dy) - Math.max(0, overlapY); }
      if (direction === 'up'    && dy < 0) { forward = true; primary = -dy; cross = Math.abs(dx) - Math.max(0, overlapX); }
      if (direction === 'down'  && dy > 0) { forward = true; primary =  dy; cross = Math.abs(dx) - Math.max(0, overlapX); }
      if (!forward) return;

      // Prefer elements roughly aligned in the direction, then nearest
      var score = primary + cross * 2.5;
      if (score < candScore) { candScore = score; cand = el; }
    });
    return cand;
  }

  function isEditable(el) {
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' ||
      el.isContentEditable);
  }

  document.addEventListener('keydown', function (e) {
    var map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
    var direction = map[e.key];
    if (!direction) return;
    if (isEditable(e.target)) return; // don't hijack typing

    // Don't interfere while a fullscreen player owns the screen
    if (document.fullscreenElement) return;

    var next = pick(direction);
    if (next) {
      e.preventDefault();
      try { next.focus({ preventScroll: false }); } catch (err) { next.focus(); }
      if (next.scrollIntoView) next.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, { capture: true });

  // Make sure something is focusable/focused when the page is ready on TV
  function initialFocus() {
    if (!document.activeElement || document.activeElement === document.body) {
      var first = pick('none');
      if (first) { try { first.focus({ preventScroll: true }); } catch (e) {} }
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialFocus);
  } else {
    setTimeout(initialFocus, 300);
  }
})();
