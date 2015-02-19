'use strict';

/* global SettingsView, HandwritingPadSettings, BaseView */

(function(exports) {

var HandwritingSettingsGroupView = function(app) {
  BaseView.apply(this);

  this.app = app;
};

HandwritingSettingsGroupView.prototype = Object.create(BaseView.prototype);

HandwritingSettingsGroupView.prototype.CONTAINER_ID = 'handwriting-settings';

HandwritingSettingsGroupView.prototype.start = function() {
  BaseView.prototype.start.call(this);

  this.childViews.handwritingSettings =
    new SettingsView(this.app, this.container, HandwritingPadSettings);
  this.childViews.handwritingSettings.start();
};

HandwritingSettingsGroupView.prototype.stop = function() {
  BaseView.prototype.stop.call(this);

  this.childViews.handwritingSettings.stop();
  delete this.childViews.handwritingSettings;
};

exports.HandwritingSettingsGroupView = HandwritingSettingsGroupView;

})(window);
