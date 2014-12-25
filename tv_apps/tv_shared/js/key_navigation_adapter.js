/* global KeyEvent, evt */
(function(exports) {
  'use strict';
  function KeyNavigationAdapter() {
  }

  KeyNavigationAdapter.prototype = evt({
    init: function kna_init() {
      window.addEventListener('keydown', this);
    },
    uninit: function kna_uninit() {
      window.removeEventListener('keydown', this);
    },

    handleEvent: function kna_handleEvent(evt) {
      switch (evt.type) {
        case 'keydown':
        this.handleKeyEvent(this.convertKeyToString(evt.keyCode));
        break;
      }
    },

    handleKeyEvent: function kna_handleKeyEvent(key) {
      // XXX : It's better to use KeyEvent.Key and use "ArrowUp", "ArrowDown",
      // "ArrowLeft", "ArrowRight" for switching after Gecko synced with W3C
      // KeyboardEvent.Key standard. Here we still use KeyCode and customized
      // string of "up", "down", "left", "right" for the moment.
      switch (key) {
        case 'up':
        case 'down':
        case 'left':
        case 'right':
          this.fire('move', key);
          break;
        case 'enter':
          this.fire('enter');
          break;
        case 'esc':
          this.fire('esc');
          break;
      }
    },

    convertKeyToString: function kna_convertKeyToString(keyCode) {
      switch (keyCode) {
        case KeyEvent.DOM_VK_UP:
          return 'up';
        case KeyEvent.DOM_VK_RIGHT:
          return 'right';
        case KeyEvent.DOM_VK_DOWN:
          return 'down';
        case KeyEvent.DOM_VK_LEFT:
          return 'left';
        case KeyEvent.DOM_VK_RETURN:
          return 'enter';
        case KeyEvent.DOM_VK_ESCAPE:
          return 'esc';
        case KeyEvent.DOM_VK_BACK_SPACE:
          return 'esc';
        default:// we don't consume other keys.
          return null;
      }
    }
  });
  exports.KeyNavigationAdapter = KeyNavigationAdapter;

}(window));
