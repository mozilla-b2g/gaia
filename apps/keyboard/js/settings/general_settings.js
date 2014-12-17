'use strict';

/* global SettingsView,
          SoundFeedbackSettings, VibrationFeedbackSettings, IMEngineSettings */

(function(exports) {

var GeneralSettingsGroupView = function GeneralSettingsGroupView(app) {
  this.app = app;

  this.container = null;
  this.soundFeedbackSettingsView = null;
  this.vibrationFeedbackSettingsView = null;
  this.imEngineSettingsView = null;
};

GeneralSettingsGroupView.prototype.PANEL_ID = 'general-settings';

GeneralSettingsGroupView.prototype.start = function() {
  var container = this.container = document.getElementById(this.PANEL_ID);

  this.soundFeedbackSettingsView =
    new SettingsView(this.app, container, SoundFeedbackSettings);
  this.soundFeedbackSettingsView.start();

  this.vibrationFeedbackSettingsView =
    new SettingsView(this.app, container, VibrationFeedbackSettings);
  this.vibrationFeedbackSettingsView.start();

  this.imEngineSettingsView =
    new SettingsView(this.app, container, IMEngineSettings);
  this.imEngineSettingsView.start();
};

GeneralSettingsGroupView.prototype.stop = function() {
  this.container = null;
  this.soundFeedbackSettingsView.stop();
  this.soundFeedbackSettingsView = null;
  this.vibrationFeedbackSettingsView.stop();
  this.vibrationFeedbackSettingsView = null;
  this.imEngineSettingsView.stop();
  this.imEngineSettingsView = null;
};

exports.GeneralSettingsGroupView = GeneralSettingsGroupView;

})(window);
