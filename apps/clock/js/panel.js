define(function(require) {
'use strict';
var View = require('view');
var priv = new WeakMap();

/**
 * A Panel is a "full screen" style tab/dialog.  Panels have an active state
 * which can be true or false, and can transition in and out using CSS3
 * classes and animation events.
 *
 * @constructor
 * @param {HTMLElement} element The element to wrap.
 */
function Panel(element) {
  View.apply(this, arguments);
  priv.set(this, {
    active: element.classList.contains('active'),
    transition: false
  });
  element.addEventListener('animationend', this);
}

Panel.prototype = Object.create(View.prototype);

/**
 * Handles the "animationend" event.  Sets the transition state to false
 * and hides the element if the Panel is not active.
 */
Panel.prototype.handleEvent = function(event) {
  if (event.target !== this.element) {
    return;
  }
  // remove visibility if transition finishes on non-active view
  if (!this.active) {
    this.visible = false;
  }
  this.transition = false;
};

Object.defineProperties(Panel.prototype, {
  /**
   * Panel.prototype.active - Boolean
   *
   * Sets the internal active state, and adds or removes the "active"
   * class on the element.
   */
  active: {
    get: function() {
      return priv.get(this).active;
    },
    set: function(value) {
      var state = priv.get(this);
      value = !!value;
      if (state.active !== value) {
        state.active = value;
        if (value) {
          this.element.classList.add('active');
        } else {
          this.element.classList.remove('active');
        }
        this.emit('active', value);
      }
      return value;
    }
  },
  /**
   * Panel.prototype.transition - String or false
   *
   * Sets the internal transition state.  When set, adds the class specified
   * to the element, removing the old transition class if it exists.
   *
   * When set to false, it removes the current transition class.
   */
  transition: {
    get: function() {
      return priv.get(this).transition;
    },
    set: function(value) {
      var state = priv.get(this);
      if (value) {
        if (state.transition) {
          this.element.classList.remove(state.transition);
        }
        this.element.classList.add(value);
      } else if (state.transition) {
        this.element.classList.remove(state.transition);
      }
      state.transition = value;
      return value;
    }
  }
});

return Panel;

});
