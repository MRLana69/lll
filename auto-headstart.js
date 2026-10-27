'use strict';
(function () {
  if (window.__surfAutoHeadstartLoaded) return;
  window.__surfAutoHeadstartLoaded = true;

  var STORAGE_KEY = 'surfAutoHeadstartEnabled';
  var HOTKEY = 'KeyB';
  var ROUNDS = 3;
  var DELAY = 60;
  var AUTO_START_DELAY = 1200;
  // Centro do headstart vermelho, medido dentro da área visível do jogo.
  var HEADSTART_X = 0.153;
  var HEADSTART_Y = 0.903;
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
  function headstartPoint(target) {
    var rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    // As proporções acompanham o redimensionamento do canvas e as barras do navegador.
    var localX = rect.width * HEADSTART_X;
    var localY = rect.height * HEADSTART_Y;
    var maxX = Math.max(0, rect.width - 1), maxY = Math.max(0, rect.height - 1);
    return { x:Math.round(rect.left + Math.min(maxX, Math.max(0, localX))),
      y:Math.round(rect.top + Math.min(maxY, Math.max(0, localY))) };
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
          clickCanvas(current, p.x, p.y);
          window.dispatchEvent(new CustomEvent('surf:auto-headstart', { detail:{ round:round + 1, total:ROUNDS, source:source } }));
        }, DELAY * i);
      })(i);
    }
    setTimeout(function () { running = false; }, DELAY * (ROUNDS - 1) + 300);
    return true;
  }
  function install() {
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
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once:true });
  else install();
  window.SurfAutoHeadstart = { enable:function () { writeEnabled(true); }, disable:function () { writeEnabled(false); }, run:run, isEnabled:readEnabled };
})();
