/* global KeyEvent, SharedUtils, evt */
(function(exports) {
  'use strict';
  // KeyNavigationAdapter files event with '-keyup' as postfix. All behaviors
  // which no need to have multple events while holding the key should use
  // keyup.
  // If we choose to listen to mozbrowser key events, before- and after- prefix
  // will be attached on filed events.
  function KeyNavigationAdapter() {
  }

  KeyNavigationAdapter.prototype = evt({
    KEY_EVENTS: Object.freeze([
      'keydown',
      'keyup'
    ]),

    MOZ_BROWSER_KEY_EVENTS: [
      'mozbrowserbeforekeydown',
      'mozbrowserbeforekeyup',
      'mozbrowserafterkeydown',
      'mozbrowserafterkeyup'
    ],

    init: function kna_init(targetElement, options) {
      this._targetElement = targetElement || window;
      options = options || {};

      // Pick required event listeners and add them
      this._evtNames = [].concat(this.KEY_EVENTS);
      if (options.useMozBrowserKeyEvents) {
        this._evtNames = this._evtNames.concat(this.MOZ_BROWSER_KEY_EVENTS);
      }
      this._evtNames.forEach(
                      name => this._targetElement.addEventListener(name, this));

      this.propagateKeyEvent = options.propagateKeyEvent || false;
    },
    uninit: function kna_uninit() {
      this._evtNames.foreach(
                   name => this._targetElement.removeEventListener(name, this));
    },

    handleEvent: function kna_handleEvent(evt) {
      if(this._evtNames.indexOf(evt.type) !== -1) {
        this.handleKeyEvent(this.convertKeyToString(evt), evt.type);
      }

      switch(evt.type) {
        case 'keyup':
        case 'keydown':
        case 'keypress':
          // By default we stop propagating keyevent. This is useful when we
          // apply KeyNavigationAdapter to a blocked sub-component such as a
          // modal-dialog-like UI. It prevents underlying UI act to the same
          // key.
          !this.propagateKeyEvent && evt.stopPropagation();
          break;
        case 'click':
          // Do forced focus again on mouse click to prevent focus lost problem
          // when running on devices like PC and phone.
          this.focus();
          break;
      }
    },

    handleKeyEvent: function kna_handleKeyEvent(key, eventType) {
      // XXX : It's better to use KeyEvent.Key and use "ArrowUp", "ArrowDown",
      // "ArrowLeft", "ArrowRight" for switching after Gecko synced with W3C
      // KeyboardEvent.Key standard. Here we still use KeyCode and customized
      // string of "up", "down", "left", "right" for the moment.
      var evtPostfix = 'keyup' === eventType ? '-keyup' : '';

      var prefixMatch = /mozbrowser(before|after)/.exec(eventType);
      var evtPrefix = prefixMatch ? prefixMatch[1] + '-' : '';

      switch (key) {
        case 'up':
        case 'down':
        case 'left':
        case 'right':
          this.fire(evtPrefix + 'move' + evtPostfix, key);
          break;
        case 'enter':
          this.fire(evtPrefix + 'enter' + evtPostfix);
          break;
        case 'back':
          this.fire(evtPrefix + 'back' + evtPostfix);
          break;
        case 'esc':
          this.fire(evtPrefix + 'esc' + evtPostfix);
          break;
      }
    },

    convertKeyToString: function kna_convertKeyToString(evt) {
      if (SharedUtils && SharedUtils.isBackKey(evt)) {
        return 'back';
      }
      switch (evt.keyCode) {
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
        default:// we don't consume other keys.
          return null;
      }
    }
  });
  exports.KeyNavigationAdapter = KeyNavigationAdapter;

}(window));
