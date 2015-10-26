'use strict';
/* global KeyEvent */

window.SmartButton = (function(win) {
  // Extend from the HTMLButtonElement prototype
  var proto = Object.create(HTMLButtonElement.prototype);

  proto.createdCallback = function() {
    this.addEventListener('mousedown', this);
    this.addEventListener('mouseup', this);
    this.addEventListener('touchstart', this);
    this.addEventListener('touchend', this);
    this.addEventListener('keydown', this);
    this.addEventListener('keyup', this);
    this.addEventListener('focus', this);
    this.addEventListener('blur', this);
    this.addEventListener('transitionend', this);
    this.tabIndex = 0;
  };

  proto.handleEvent = function(evt) {
    switch(evt.type) {
      case 'mousedown':
      case 'touchstart':
        this.classList.add('pressed');
        break;
      case 'keydown':
        if (evt.keyCode === KeyEvent.DOM_VK_RETURN) {
          this.classList.add('pressed');
        }
        break;
      case 'mouseup':
      case 'touchend':
        this.classList.remove('pressed');
        this.classList.add('released');
        break;
      case 'keyup':
        if (evt.keyCode === KeyEvent.DOM_VK_RETURN) {
          this.classList.remove('pressed');
          this.classList.add('released');
          this.click();
        }
        break;
      case 'transitionend':
        if (this.classList.contains('released')) {
          this.classList.remove('released');
        }
        break;
      case 'focus':
        this.classList.add('focused');
        break;
      case 'blur':
        this.classList.remove('pressed');
        this.classList.remove('released');
        this.classList.remove('focused');
        break;
    }
  };

  // Register and return the constructor
  return document.registerElement('smart-button', { prototype: proto });
})(window);
