define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var View = require('vendor/view');
var find = require('lib/find');

/**
 * Exports
 */

module.exports = View.extend({
  name: 'focus',
  fadeTime: 500,

  initialize: function() {
    this.render();
    this.setFocusState('none');
  },

  render: function() {
    this.el.innerHTML = this.template();
    this.els.focus = find('.js-focus', this.el);
  },

  setFocusState: function(state) {
    this.set('state', state);
    if (this.fadeOutTimer) {
      clearTimeout(this.fadeOutTimer);
    }
    if (state === 'fail' || state === 'focused') {
      this.fadeOutTimer = this.fadeOut();
    }
  },

  setFocusMode: function(mode) {
    this.reset();
    this.set('mode', mode);
  },

  changePosition: function(x, y) {
    this.el.style.left = x + 'px';
    this.el.style.top = y + 'px';
  },

  reset: function() {
    this.el.style.left = '50%';
    this.el.style.top = '50%';
    this.setFocusState('none');
  },

  fadeOut: function() {
    var self = this;
    setTimeout(hide, this.fadeTime);
    function hide() {
      self.setFocusState('none');
    }
  },

  template: function() {
    return '<div class="focus-ring icon-focus-locking js-focus"></div>';
  }

});

});
