/* global evt, KeyEvent */
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
    this._paused = true;
  }

  var proto = SimpleKeyNavigation.prototype = new evt();

  SimpleKeyNavigation.DIRECTION = Object.freeze({
    'HORIZONTAL': 'horizontal',
    'VERTICAL': 'vertical'
  });

  proto.start = function skn_start(list, direction, options) {
    this._paused = false;
    this.direction = direction;
    this.updateList(list);
    this.isChild = options ? !!options.isChild : false;
    this.target = (options && options.target) || window;
    if (!this.isChild) {
      this.target.addEventListener('keydown', this);
    }
  };

  proto.stop = function skn_stop() {
    this.target.removeEventListener('keydown', this);
  };

  proto.pause = function skn_pause() {
    if (this._paused) {
      return;
    }

    this._paused = true;
    this._List.forEach((elem) => { // For nested case
      if (elem instanceof SimpleKeyNavigation) {
        elem.pause();
      }
    });
  };

  proto.resume = function skn_resume() {
    if (!this._paused) {
      return;
    }

    this._paused = false;
    this._List.forEach((elem) => { // For nested case
      if (elem instanceof SimpleKeyNavigation) {
        elem.resume();
      }
    });
  };

  proto.updateList = function skn_updateList(list) {
    this._List = list;
    this._focusedIndex = -1;
    if (list.length > 0) {
      this._focusedIndex = 0;
      this.focus();
    }
  };

  proto.getFocusedElement = function skn_getFocusedElement() {
    var elem = this._List[this._focusedIndex];
    if (!elem) {
      elem = null;
    } else if (elem instanceof SimpleKeyNavigation) {
      elem = elem.getFocusedElement();
    }
    return elem;
  };

  proto.focus = function skn_focus() {
    var elem = this._List[this._focusedIndex];
    if (elem.focus && (typeof elem.focus) === 'function') {
      elem.focus();
    }
    // Fon nested case, we need to propagate child navigator event to parent.
    if (elem instanceof SimpleKeyNavigation) {
      elem = elem._List[elem._focusedIndex];
    }
    this.fire('focusChanged', elem);
  };

  proto.blur = function skn_blur() {
    var elem = this._List[this._focusedIndex];
    elem.blur && (typeof elem.blur === 'function') && elem.blur();

    // Fon nested case, we need to propagate child navigator event to parent.
    if (elem instanceof SimpleKeyNavigation) {
      elem = elem._List[elem._focusedIndex];
    }
    this.fire('focusBlurred', elem);
  };

  proto.focusOn = function skn_focusOn(elem) {
    var index = this._List.indexOf(elem);
    if (index >= 0) {
      this._focusedIndex = index;
      this._List[this._focusedIndex].focus();
      this.fire('focusChanged', this._List[this._focusedIndex]);
    }
  };

  proto.movePrevious = function skn_movePrevious() {
    if (this._focusedIndex < 1) {
      return;
    }
    this._focusedIndex--;
    this.focus();
  };

  proto.moveNext = function skn_moveNext() {
    if (this._focusedIndex > this._List.length - 2) {
      return;
    }
    this._focusedIndex++;
    this.focus();
  };

  proto.handleKeyMove = function skn_handleKeyMove(e, pre, next) {
    if (this._paused) {
      return;
    }

    if (e.keyCode === pre) {
      this.movePrevious();
    } else if (e.keyCode === next) {
      this.moveNext();
    }
  };

  proto.propagateKeyMove = function skn_propagateKeyMove(e, pre, next) {
    if (this._paused) {
      return;
    }

    if (this._List[this._focusedIndex] instanceof SimpleKeyNavigation &&
      (e.keyCode === pre || e.keyCode === next)) {
      this._List[this._focusedIndex].handleEvent(e);
    }
  };

  proto.handleEvent = function skn_handleEvent(e) {
    if (this._paused) {
      return;
    }

    if (this.direction === SimpleKeyNavigation.DIRECTION.HORIZONTAL) {
      this.handleKeyMove(e, KeyEvent.DOM_VK_LEFT, KeyEvent.DOM_VK_RIGHT);
      this.propagateKeyMove(e, KeyEvent.DOM_VK_UP, KeyEvent.DOM_VK_DOWN);
    } else {
      this.handleKeyMove(e, KeyEvent.DOM_VK_UP, KeyEvent.DOM_VK_DOWN);
      this.propagateKeyMove(e, KeyEvent.DOM_VK_LEFT, KeyEvent.DOM_VK_RIGHT);
    }
  };

  exports.SimpleKeyNavigation = SimpleKeyNavigation;

})(window);
