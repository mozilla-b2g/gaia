define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('controller:indicator');
var bindAll = require('lib/bind-all');

/**
 * Exports
 */

module.exports = function(app) { return new IndicatorsController(app); };
module.exports.IndicatorsController = IndicatorsController;

/**
 * Initialize a new `IndicatorsController`
 *
 * @param {Object} options
 */
function IndicatorsController(app) {
  debug('initializing');
  bindAll(this);
  this.app = app;
  this.settings = app.settings;
  this.indicators = app.views.indicators;
  this.enabled = this.settings.indicators.get('enabled');
  if (this.enabled) { this.bindEvents(); }
  debug('initialized');
}

IndicatorsController.prototype.bindEvents = function() {

    this.app.on('settings:configured', this.configure);

  if (this.enabled.timer) {
    this.settings.timer.on('change:selected', this.indicators.setter('timer'));
  }
  
  if (this.enabled.hdr) {
    this.settings.hdr.on('change:selected', this.indicators.setter('hdr'));
  }
  
  if (this.enabled.geolocation) {
    this.app.on('focus', this.geoLocationStatus);
  }

  if (this.enabled.battery) {
    this.app.on('change:batteryStatus', this.indicators.setter('battery')); 
  }

};

IndicatorsController.prototype.configure = function() {
  if (this.enabled.hdr) {
    this.indicators.set('hdr', this.settings.hdr.selected('key'));
  }
  
  if (this.enabled.timer) {
    this.indicators.set('timer', this.settings.timer.selected('key'));
  }
  
  if (this.enabled.geolocation) {
    this.updateGeolocationStatus();
  }
  
  this.indicators.show();
};

IndicatorsController.prototype.updateGeolocationStatus = function() {
  var mozPerms = navigator.mozPermissionSettings;
  var indicator = this.indicators;
  var self = this;
  var request = navigator.mozApps.getSelf();
  request.onsuccess = function() {
  if (request.result) {
    var value = mozPerms.get("geolocation", request.result.manifestURL, request.result.origin, false);
    switch (value) {
      case "allow":
        self.indicators.set('geotagging', 'on');
        break;
      case "deny":
        self.indicators.set('geotagging', 'off');
        break;
      case "prompt":{
        setTimeout(function(){self.updateGeolocationStatus();},500);
        break;
      }
    }
  } else {
    alert("Called from outside of an app");
  }
};
request.onerror = function() {
  // Display error name from the DOMError object
  alert("Error: " + request.error.name);
};
 /* apps.mgmt.getAll().onsuccess = function mozAppGotAll(evt) {
    var apps = evt.target.result;
    apps.forEach(function(app) {
      if (app.manifest.name == "Camera") {  //change Camera to CameraMadai for madai
        var value = mozPerms.get("geolocation", app.manifestURL, app.origin, false);
        switch (value) {
          case "allow":
            self.indicators.set('geotagging', 'on');
            break;
          case "deny":
            self.indicators.set('geotagging', 'off');
            break;
          case "prompt":{
            setTimeout(function(){self.geoLocationStatus();},500);
            break;
          }
        }
      }
    });
  };*/
};

});