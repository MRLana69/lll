'use strict';
(function () {
  if (window.__surfAutoHeadstartLoaded) return;
  window.__surfAutoHeadstartLoaded = true;

  var STORAGE_KEY = 'surfAutoHeadstartEnabled';
  var HOTKEY = 'KeyB';
  var ROUNDS = 3;
  var DELAY = 60;
  var AUTO_START_DELAY = 1200;
  var activeCanvas = null;
  var running = false;

  function readEnabled() {
    try {
      var value = localStorage.getItem(STORAGE_KEY);
      return value === null ? true : value === 'true';
    } catch (e) { return false; }
  }
  function writeEnabled(value) {
    try { localStorage.setItem(STORAGE_KEY, String(!!value)); } catch (e) {}
  }
  function canvas() {
    return document.querySelector('#game canvas') || document.querySelector('canvas');
  }
  function waitForCanvas(callback) {
    var current = canvas();
    if (current && current.width > 0 && current.height > 0) { callback(current); return; }
    var timer = setInterval(function () {
      var next = canvas();
      if (!next || next.width <= 0 || next.height <= 0) return;
      clearInterval(timer); callback(next);
    }, 120);
  }
  function eventInit(x, y, buttons) {
    return { bubbles:true, cancelable:true, composed:true, view:window,
      clientX:x, clientY:y, screenX:Math.round((window.screenX || 0) + x),
      screenY:Math.round((window.screenY || 0) + y), button:0, buttons:buttons,
      pointerId:1, pointerType:'mouse', isPrimary:true };
  }
  function send(target, type, Ctor, x, y, buttons) {
    if (typeof Ctor !== 'function') return;
    try { target.dispatchEvent(new Ctor(type, eventInit(x, y, buttons))); } catch (e) {}
  }
  function clickCanvas(target, x, y) {
    send(target, 'pointerover', window.PointerEvent, x, y, 0);
    send(target, 'mouseover', window.MouseEvent, x, y, 0);
    send(target, 'pointerenter', window.PointerEvent, x, y, 0);
    send(target, 'mouseenter', window.MouseEvent, x, y, 0);
    send(target, 'pointermove', window.PointerEvent, x, y, 0);
    send(target, 'mousemove', window.MouseEvent, x, y, 0);
    send(target, 'pointerdown', window.PointerEvent, x, y, 1);
    send(target, 'mousedown', window.MouseEvent, x, y, 1);
    send(target, 'pointerup', window.PointerEvent, x, y, 0);
    send(target, 'mouseup', window.MouseEvent, x, y, 0);
    send(target, 'click', window.MouseEvent, x, y, 0);
  }
  function indicator(x, y) {
    var dot = document.createElement('div');
    dot.style.cssText = 'position:fixed;width:26px;height:26px;border-radius:50%;pointer-events:none;z-index:2147483647;transform:translate(-50%,-50%);background:#00d9ff;box-shadow:0 0 18px #00d9ff;left:' + x + 'px;top:' + y + 'px;';
    document.body.appendChild(dot);
    setTimeout(function () { dot.remove(); }, 260);
  }
  function headstartPoint(target) {
    var rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    var maxX = Math.max(1, rect.width - 24), maxY = Math.max(1, rect.height - 24);
    var rawX = Math.min(rect.width * 0.16, rect.height * 0.16 * (608 / 1080));
    var rawY = rect.height * 0.82;
    return { x:Math.round(rect.left + Math.min(maxX, Math.max(Math.min(48, maxX), rawX))),
      y:Math.round(rect.top + Math.min(maxY, Math.max(Math.min(80, maxY), rawY))) };
  }
  function run(source) {
    if (running || document.hidden) return false;
    var target = activeCanvas || canvas();
    if (!target) return false;
    running = true;
    var point = headstartPoint(target);
    if (!point) { running = false; return false; }
    for (var i = 0; i < ROUNDS; i++) {
      (function (round) {
        setTimeout(function () {
          if (document.hidden) return;
          var current = canvas() || target;
          var p = headstartPoint(current);
          if (!p) return;
          indicator(p.x, p.y);
          clickCanvas(current, p.x, p.y);
          window.dispatchEvent(new CustomEvent('surf:auto-headstart', { detail:{ round:round + 1, total:ROUNDS, source:source } }));
        }, DELAY * i);
      })(i);
    }
    setTimeout(function () { running = false; }, DELAY * (ROUNDS - 1) + 300);
    return true;
  }
  function updateButton(button, enabled) {
    button.innerHTML = 'AUTO HEADSTART: ' + (enabled ? 'ON' : 'OFF') + '<small>3 ativações · tecla B</small>';
    button.dataset.enabled = enabled ? 'true' : 'false';
    button.style.background = enabled ? '#00a8ff' : 'rgba(13,16,31,.92)';
    button.style.color = enabled ? '#06111c' : '#dbeaff';
  }
  function installUI() {
    var style = document.createElement('style');
    style.textContent = '#surf-auto-headstart{position:fixed;right:14px;bottom:14px;z-index:2147483646;border:1px solid #00a8ff;border-radius:8px;padding:10px 13px;background:rgba(13,16,31,.92);color:#dbeaff;font:700 10px/1 Arial,sans-serif;letter-spacing:.08em;cursor:pointer;box-shadow:0 4px 18px rgba(0,0,0,.35);touch-action:manipulation}#surf-auto-headstart small{display:block;margin-top:5px;color:inherit;opacity:.7;font-size:8px;letter-spacing:.04em}';
    document.head.appendChild(style);
    var button = document.createElement('button');
    button.id = 'surf-auto-headstart';
    button.type = 'button';
    button.innerHTML = 'AUTO HEADSTART: OFF<small>3 ativações · tecla B</small>';
    button.addEventListener('click', function () { var next = !readEnabled(); writeEnabled(next); updateButton(button, next); });
    document.body.appendChild(button);
    updateButton(button, readEnabled());
    document.addEventListener('keydown', function (event) {
      if (event.code !== HOTKEY || event.repeat || event.target && /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
      if (!readEnabled()) return;
      event.preventDefault(); event.stopImmediatePropagation(); run('hotkey');
    }, true);
    waitForCanvas(function (target) {
      activeCanvas = target;
      if (readEnabled()) {
        // Atraso curto para deixar o Unity terminar a transição inicial da cena.
        setTimeout(function () { run('automatic'); }, AUTO_START_DELAY);
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installUI, { once:true });
  else installUI();
  window.SurfAutoHeadstart = { enable:function () { writeEnabled(true); }, disable:function () { writeEnabled(false); }, run:run, isEnabled:readEnabled };
})();
