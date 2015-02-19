/* global KeyEvent, evt */
(function(exports) {
  'use strict';
  // KeyNavigationAdapter files event with '-keyup' as postfix. All behaviors
  // which no need to have multple events while holding the key should use
  // keyup.
  function KeyNavigationAdapter() {
  }

  KeyNavigationAdapter.prototype = evt({
    init: function kna_init(targetElement) {
      this._targetElement = targetElement || window;
      this._targetElement.addEventListener('keydown', this);
      this._targetElement.addEventListener('keyup', this);
    },
    uninit: function kna_uninit() {
      this._targetElement.removeEventListener('keydown', this);
      this._targetElement.removeEventListener('keyup', this);
    },

    handleEvent: function kna_handleEvent(evt) {
      switch (evt.type) {
        case 'keydown':
        case 'keyup':
          this.handleKeyEvent(this.convertKeyToString(evt.keyCode), evt.type);
          break;
      }
    },

    handleKeyEvent: function kna_handleKeyEvent(key, eventType) {
      // XXX : It's better to use KeyEvent.Key and use "ArrowUp", "ArrowDown",
      // "ArrowLeft", "ArrowRight" for switching after Gecko synced with W3C
      // KeyboardEvent.Key standard. Here we still use KeyCode and customized
      // string of "up", "down", "left", "right" for the moment.
      var evtPostfix = 'keyup' === eventType ? '-keyup' : '';
      switch (key) {
        case 'up':
        case 'down':
        case 'left':
        case 'right':
          this.fire('move' + evtPostfix, key);
          break;
        case 'enter':
          this.fire('enter' + evtPostfix);
          break;
        case 'esc':
          this.fire('esc' + evtPostfix);
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
