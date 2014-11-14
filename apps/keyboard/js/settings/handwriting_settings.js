'use strict';

/* global SettingsView, HandwritingPadSettings */

(function(exports) {

var HandwritingSettingsGroupView = function(app) {
  this.app = app;

  this.container = null;
  this.handwritingSettingsView = null;
};

HandwritingSettingsGroupView.prototype.PANEL_ID = 'handwriting-settings';

HandwritingSettingsGroupView.prototype.start = function() {
  var container = this.container = document.getElementById(this.PANEL_ID);

  this.handwritingSettingsView =
    new SettingsView(this.app, container, HandwritingPadSettings);
  this.handwritingSettingsView.start();
};

HandwritingSettingsGroupView.prototype.stop = function() {
  this.container = null;
  this.handwritingSettingsView.stop();
  this.handwritingSettingsView = null;
};

exports.HandwritingSettingsGroupView = HandwritingSettingsGroupView;

})(window);
