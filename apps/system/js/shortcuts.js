/* global BaseModule, ScreenManager */
'use strict';
(function() {
  /* For hardware key handling that doesn't belong to anywhere */
  var Shortcuts = function() {};
  Shortcuts.EVENTS = [
    'keyup'
  ];
  BaseModule.create(Shortcuts, {
    name: 'Shortcuts',

    _start: function() {
      window.addEventListener('touchstart', this, true);
      window.addEventListener('touchend', this, true);
      window.addEventListener('mousedown', this, true);
      window.addEventListener('mouseup', this, true);
    },
    /* === XXX Bug 900512 === */
    // On some devices touching the hardware home button triggers
    // touch events at position 0,0. In order to make sure those does
    // not trigger unexpected behaviors those are captured here.
    _handle_touchstart: function(evt) {
      if (evt.touches[0].pageX === 0 && evt.touches[0].pageY === 0) {
        evt.preventDefault();
        evt.stopImmediatePropagation();
      }
    },

    _handle_touchend: function(evt) {
      if (evt.changedTouches[0].pageX === 0 &&
          evt.changedTouches[0].pageY === 0) {
        evt.preventDefault();
        evt.stopImmediatePropagation();
      }
    },

    _handle_mousedown: function(evt) {
      this._handle_mouse(evt);
    },

    _handle_mouseup: function(evt) {
      this._handle_mouse(evt);
    },

    _handle_mouse: function(evt) {
      if (evt.pageX === 0 && evt.pageY === 0) {
        evt.preventDefault();
        evt.stopImmediatePropagation();
      }
    },

    _handle_keyup: function(evt) {
      if (!ScreenManager.screenEnabled || evt.keyCode !== evt.DOM_VK_F6) {
        return;
      }

      document.location.reload();
    }
  });
}());
