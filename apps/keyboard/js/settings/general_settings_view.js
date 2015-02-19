'use strict';

/* global SettingsView, BaseView,
          SoundFeedbackSettings, VibrationFeedbackSettings, IMEngineSettings */

(function(exports) {

var GeneralSettingsGroupView = function GeneralSettingsGroupView(app) {
  BaseView.apply(this);

  this.app = app;
};

GeneralSettingsGroupView.prototype = Object.create(BaseView.prototype);

GeneralSettingsGroupView.prototype.CONTAINER_ID = 'general-settings';

GeneralSettingsGroupView.prototype.start = function() {
  BaseView.prototype.start.call(this);

  this.childViews.soundFeedbackSettings =
    new SettingsView(this.app, this.container, SoundFeedbackSettings);
  this.childViews.soundFeedbackSettings.start();

  this.childViews.vibrationFeedbackSettings =
    new SettingsView(this.app, this.container, VibrationFeedbackSettings);
  this.childViews.vibrationFeedbackSettings.start();

  this.childViews.imEngineSettings =
    new SettingsView(this.app, this.container, IMEngineSettings);
  this.childViews.imEngineSettings.start();
};

GeneralSettingsGroupView.prototype.stop = function() {
  BaseView.prototype.stop.call(this);

  this.childViews.soundFeedbackSettings.stop();
  delete this.childViews.soundFeedbackSettings;

  this.childViews.vibrationFeedbackSettings.stop();
  delete this.childViews.vibrationFeedbackSettings;

  this.childViews.imEngineSettings.stop();
  delete this.childViews.imEngineSettings;
};

exports.GeneralSettingsGroupView = GeneralSettingsGroupView;

})(window);
