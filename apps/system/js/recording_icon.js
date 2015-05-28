/* global BaseIcon */
'use strict';

(function(exports) {
  var RecordingIcon = function(manager) {
    BaseIcon.call(this, manager);
  };
  RecordingIcon.prototype = Object.create(BaseIcon.prototype);
  RecordingIcon.prototype.name = 'RecordingIcon';
  RecordingIcon.prototype.kActiveIndicatorTimeout = 5 * 1000;
  RecordingIcon.prototype.update = function() {
    var icon = this.element;
    if (!icon || !this.enabled()) {
      return;
    }
    this.debug('updating', this.manager.isRecording);
    clearTimeout(this.recordingTimer);
    icon.dataset.active = this.manager.isRecording;

    if (this.manager.isRecording) {
      // Recording is currently active, show the active icon.
      this.show();
      return;
    }

    // Recording is currently inactive.
    // Show the inactive icon and hide it after kActiveIndicatorTimeout
    this.recordingTimer = window.setTimeout(function() {
      this.hide();
    }.bind(this), this.kActiveIndicatorTimeout);
    this.publish('changed');
  };
  exports.RecordingIcon = RecordingIcon;
}(window));
