define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('view:focus');
var View = require('vendor/view');

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
    this.els.focus = this.find('.js-focus');

    // Clean up
    delete this.template;
    
    debug('rendered');
    return this;
  },

  setFocusState: function(state, isVideo) {
    this.set('state', state);
    if (state === 'none') {
      this.fadeOut();
    } else if(!isVideo) {
      this.fadeOut(3000);
    }
  },

  setFocusMode: function(mode) {
    this.reset();
    this.set('mode', mode);
  },

  setPosition: function(x, y) {
    this.el.style.left = x + 'px';
    this.el.style.top = y + 'px';
  },

  reset: function() {
    this.el.style.left = '50%';
    this.el.style.top = '50%';
    this.set('state', 'none');
  },

  fadeOut: function(time) {
    var self = this;
    var timer = time ? time : this.fadeTime;
    if (this.fadeOutTimer) {
      clearTimeout(this.fadeOutTimer);
    }
    this.fadeOutTimer = setTimeout(hide, timer);
    function hide() {
      self.reset();
    }
  },

  template: function() {
    return '<div class="focus-ring icon-focus-locking js-focus"></div>';
  }

});

});
