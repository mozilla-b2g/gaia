define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var View = require('view');

/**
 * Exports
 */

module.exports = View.extend({
  name: 'indicators',
  tag: 'ul',

  initialize: function() {
    this.render();
  },

  render: function() {
    this.el.innerHTML = this.template();
  },

  template: function() {
    return '<li class="indicator_timer icon-self-timer rotates"></li>' +
    '<li class="indicator_hdr icon-hdr rotates"></li>' +
    '<li class="indicator_geolocation icon-location rotates"></li>' +
    '<li class="indicator_battery icon-battery-low rotates"></li>';
  }
});

});