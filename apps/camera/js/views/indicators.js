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
  name:'indicators',
  tag: 'ul',

  initialize: function() {
    this.render();
  },

  render: function() {
    this.el.innerHTML = this.template();
    this.els.battery = find('.indicator_battery', this.el);
  },

  template: function() {
    return '<li class="indicator_timer icon-timer rotates"></li>'+
    '<li class="indicator_geotagging icon-geo-location rotates"></li>'+
    '<li class="indicator_hdr icon-hdr rotates"></li>'+
    '<li class="indicator_battery rotates"></li>';
  },
  
});

});