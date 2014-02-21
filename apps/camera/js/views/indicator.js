define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var View = require('vendor/view');
var find = require('lib/find');
var orientation = require('lib/orientation');
/**
 *Exports
 */
module.exports = View.extend({
  name:'indicator',
  initialize: function() {
    this.render();
  },
  render: function() {
    this.el.innerHTML = this.template();
    this.els.batterystatus = find('.js-batterystatus', this.el);
    this.setOrientation(orientation.get());
    orientation.on('orientation', this.setOrientation);
  },
  template: function(){
    return '<ul>'+
    '<li class="js-batterystatus  batteryStatus rotates"></li></ul>';
  },
 
  /**
   * Set low battery  Incicator
   */
  setBatteryStatus:function(value,charging){
    //console.log("  value:: "+value+"  charging:: "+charging);
    this.els.batterystatus.setAttribute('data-value',value);
    this.els.batterystatus.setAttribute('data-mode',charging);
  },
  /**
   * on orientation change 
   * set the orientation for indicator
   */
  setOrientation: function(orientation) {
    this.el.dataset.orientation = orientation;
    this.els.batterystatus.dataset.orientation = orientation;
  },
});
});