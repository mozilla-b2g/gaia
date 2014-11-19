/* global BaseIcon */
'use strict';

(function(exports) {
  var RecordingIcon = function() {};
  RecordingIcon.prototype = Object.create(BaseIcon.prototype);
  RecordingIcon.prototype.EVENT_PREFIX = 'RecordingIcon';
  RecordingIcon.prototype.handleEvent = function() {
    switch (evt.type) {
      case 'recordingEvent':
        switch (evt.detail.type) {
          case 'recording-state-changed':
            this.recordingActive = evt.detail.active;
            this.update();
            break;
        }
        break;
    }
  };
  RecordingIcon.prototype.kActiveIndicatorTimeout = 5 * 1000;
  RecordingIcon.prototype.update = function() {
    var icon = this.element;
    if (!icon) {
      return;
    }
    clearTimeout(this.recordingTimer);
    icon.dataset.active = this.manager.isRecording;

    if (this.manager.isRecording) {
      // Recording is currently active, show the active icon.
      this.show();
      return;
    }

    // Recording is currently inactive.
    // Show the inactive icon and hide it after kActiveIndicatorTimeout
    this.recordingTimer = setTimeout(function hideRecordingIcon() {
      this.hide();
    }.bind(this), this.kActiveIndicatorTimeout);
  };
  exports.RecordingIcon = RecordingIcon;
}(window));
