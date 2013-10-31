define(function(require) {
'use strict';
var Emitter = require('emitter');
var priv = new WeakMap();
var elementMap = new WeakMap();

/**
 * A View is simply a wrapper around an element.
 *
 * @constructor
 * @param {HTMLElement} element The element that will be wrapped by this view.
 */
function View(element) {
  if (!(this instanceof View)) {
    throw new Error('View must be called as a constructor');
  }
  elementMap.set(element, this);

  Object.defineProperties(this, {
    id: { value: element.id },
    element: { value: element }
  });

  priv.set(this, {
    visible: !element.classList.contains('hidden')
  });
}

/**
 * Find or create a view instance for an element.
 *
 * @param {HTMLElement} element The element that will be wrapped by the view.
 * @param {Function} ctor The constructor method for the view, defaults to View.
 */
View.instance = function(element, ctor = View) {
  if (elementMap.has(element)) {
    return elementMap.get(element);
  }
  return new ctor(element);
};

View.prototype = Object.create(Emitter.prototype);

Object.defineProperties(View.prototype, {
  /**
   * View.prototype.visible - set to true or false to toggle the "hidden" class
   * on the element.
   *
   * Also emits a 'visibilitychange' event passing either true or false to show
   * the new visible state.  The event happens before the class is changed to
   * allow time to modify the DOM before something becomes visible.
   */
  visible: {
    get: function() {
      return priv.get(this).visible;
    },
    set: function(value) {
      var state = priv.get(this);
      value = !!value;
      if (state.visible !== value) {
        state.visible = value;
        this.emit('visibilitychange', value);
        if (!value) {
          this.element.classList.add('hidden');
        } else {
          this.element.classList.remove('hidden');
        }
      }
      return value;
    }
  }
});

return View;

});
