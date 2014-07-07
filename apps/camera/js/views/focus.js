define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var find = require('lib/find');
var View = require('view');

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
    if (state !== 'focusing') {
      this.fadeOut();
    }
  },

  setFocusMode: function(mode) {
    this.reset();
    this.set('mode', mode);
  },

  setPosition: function(x, y) {
    if (this.fadeOutTimer) {
      clearTimeout(this.fadeOutTimer);
    }
    this.el.style.left = x + 'px';
    this.el.style.top = y + 'px';
  },

  reset: function() {
    this.el.style.left = '50%';
    this.el.style.top = '50%';
    this.set('state', 'none');
  },

  fadeOut: function() {
    var self = this;
    this.fadeOutTimer = setTimeout(hide, this.fadeTime);
    function hide() {
      self.reset();
    }
  },

  template: function() {
    return '<div class="focus-ring icon-focus-locking js-focus"></div>';
  }

});

});
