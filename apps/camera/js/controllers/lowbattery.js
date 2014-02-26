define(function(require, exports, module) {
  /*jshint laxbreak:true*/

'use strict';

/**
 * Dependencies
 */

var bindAll = require('lib/bind-all');
var debug = require('debug')('controller:lowbattery');
var bind = require('lib/bind');
/**
 * Local variables
 **/
var toastMsg = require('views/toastmessage');

/**
 * Exports
 */
exports = module.exports = function(app) {
  return new LowBatteryController(app);
};
/**
 * Initialize a new `LowBatteryController`
 *
 * @param {Object} options
 */
function LowBatteryController(app){
  this.app = app;
  this.camera = app.camera;
  this.indicator = app.views.indicator;
  this.toast = new toastMsg();
  this.battery = navigator.battery || navigator.mozBattery;
  bindAll(this);
  this.bindEvents();
  this.batteyCheck();
  debug('initialized');
}

/**
 * Bind callbacks to required events.
 *
 */
LowBatteryController.prototype.bindEvents = function(){
  //Bind battery level change events
  bind(this.battery,'levelchange',this.batteyCheck);
};
/**
 * lowBatteryHandler` to handle low battery scenario
 *
 * @param {Object} options
 */
LowBatteryController.prototype.lowBatteryHandler = function (value){
  var toast = this.toast;
  var indicator =  this.indicator;
  toast.removeMessage();
  if (value <=15 && value >6){
    toast.setLowBatteryMesg(value);
    setTimeout(function(){
      toast.removeMessage();
      indicator.setBatteryStatus(value,'notcharging');
    },3000);
  }else if (value == 6){
    toast.setLowBatteryMesg(value);
    indicator.setBatteryStatus(value,'notcharging');
  }
  else if (value <=5){
    var camera = this.camera;
    toast.setLowBatteryMesg(value);
    if (camera.get('recording')){
      camera.stopRecording();
    }
    setTimeout(function(){toast.removeMessage(); window.close();},3000);
  }
};
/**
 *Check the battery level and call lowBatteryHandler
 **/
LowBatteryController.prototype.batteyCheck = function(){
  var level = Math.round(this.battery.level * 100);
  if (level <= 15){
    this.lowBatteryHandler(level);
  }
};
});