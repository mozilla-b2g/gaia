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
  name: 'focus-ring',

  initialize: function() {
    this.render();
    this.els.focus.dataset.state = 'none';
  },
  render: function() {
    this.el.innerHTML = this.template();
    this.els.focus = find('.js-focus',this.el);
  },

  setState: function(state) {
    this.els.focus.dataset.state = state;
  },

  template: function() {
    return '<div class="focus-ring icon-focus-locking js-focus"></div>'
  }
});

});
