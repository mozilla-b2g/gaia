(function(exports) {
  'use strict';
  /**
   * SimpleKeyNavigation handles left/right or top/bottom keys to move the
   * focus. It is a very simple version of key navigation. It only moves the
   * focus among an array.
   *
   * Please note that this module listens key event and changes focus while we
   * start it. If we don't need it, we should stop it.
  **/
  function SimpleKeyNavigation() {
  }

  var proto = SimpleKeyNavigation.prototype = new evt();

  SimpleKeyNavigation.DIRECTION = Object.freeze({
    'HORIZONTAL': 'horizontal',
    'VERTICAL': 'vertical'
  });

  proto.start = function skn_start(list, direction) {
    this.direction = direction;
    this.updateList(list);
    window.addEventListener('keyup', this);
  };

  proto.stop = function skn_stop() {
    window.removeEventListener('keyup', this);
  };

  proto.updateList = function skn_updateList(list) {
    this._List = list;
    this._focusedIndex = -1;
    if (list.length > 0) {
      this._focusedIndex = 0;
      if (list[0].focus && (typeof list[0].focus) === 'function') {
        list[0].focus();
      }
      this.fire('focusChanged', list[0]);
    }
  };

  proto.movePrevious = function skn_movePrevious() {
    if (this._focusedIndex < 1) {
      return;
    }

    this._focusedIndex--;
    if (this._List[this._focusedIndex].focus &&
        (typeof this._List[this._focusedIndex].focus) === 'function') {

      this._List[this._focusedIndex].focus();
    }
    this.fire('focusChanged', this._List[this._focusedIndex]);
  };

  proto.moveNext = function skn_moveNext() {
    if (this._focusedIndex > this._List.length - 2) {
      return;
    }
    this._focusedIndex++;
    if (this._List[this._focusedIndex].focus &&
        (typeof this._List[this._focusedIndex].focus) === 'function') {

      this._List[this._focusedIndex].focus();
    }
    this.fire('focusChanged', this._List[this._focusedIndex]);
  };

  proto.handleKeyMove = function skn_handleKeyMove(e, pre, next) {
    if (e.keyCode === pre) {
      this.movePrevious();
    } else if (e.keyCode === next) {
      this.moveNext();
    }
  };

  proto.handleEvent = function skn_handleEvent(e) {
    if (this.direction === SimpleKeyNavigation.DIRECTION.HORIZONTAL) {
      this.handleKeyMove(e, KeyEvent.DOM_VK_LEFT, KeyEvent.DOM_VK_RIGHT);
    } else {
      this.handleKeyMove(e, KeyEvent.DOM_VK_UP, KeyEvent.DOM_VK_DOWN);
    }
  };

  exports.SimpleKeyNavigation = SimpleKeyNavigation;

})(window);
