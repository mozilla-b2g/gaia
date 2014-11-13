/* global System, BaseUI */
'use strict';

(function(exports) {
  var RecordingIcon = function(manager) {
    this.manager = manager;
  };
  RecordingIcon.prototype = Object.create(BaseUI.prototype);
  RecordingIcon.prototype.constructor = RecordingIcon;
  RecordingIcon.prototype.EVENT_PREFIX = 'RecordingIcon';
  RecordingIcon.prototype.containerElement = document.getElementById('statusbar');
  RecordingIcon.prototype.view = function() {
    return '<div id="' + this.instanceID + '" class="sb-icon sb-icon-recording" ' +
              'hidden role="listitem" data-l10n-id="statusbarRecording"></div>';
  };
  RecordingIcon.prototype.instanceID = 'statusbar-recording';
  RecordingIcon.prototype._fetchElements = function() {
    this.element = document.getElementById(this.instanceID);
  };
  RecordingIcon.prototype.show = function() {
    var hidden = this.element.hidden;
    if (!hidden) {
      return;
    }
    this.element.hidden = false;
    this.publish('shown');
  };
  RecordingIcon.prototype.hide = function() {
    var hidden = this.element.hidden;
    if (hidden) {
      return;
    }
    this.element.hidden = true;
    this.publish('hidden');
  };
  RecordingIcon.prototype.start = function() {
    // Listen to Custom event send by 'media_recording.js'
    window.addEventListener('recordingEvent', this);
  };
  RecordingIcon.prototype.stop = function() {
    window.removeEventListener('recordingEvent', this);
  };
  RecordingIcon.prototype.isVisible = function() {
    return this.element && !this.element.hidden;
  };
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
    clearTimeout(this.recordingTimer);
    icon.dataset.active = this.recordingActive;

    if (this.recordingActive) {
      // Recording is currently active, show the active icon.
      this.show();
      this.manager._updateIconVisibility();
      return;
    }

    // Recording is currently inactive.
    // Show the inactive icon and hide it after kActiveIndicatorTimeout
    this.recordingTimer = setTimeout(function hideRecordingIcon() {
      this.hide();
      this.manager._updateIconVisibility();
    }.bind(this), this.kActiveIndicatorTimeout);

    // The icon active state may have changed (visually indicated by its
    // opacity) in the maximised status bar, so we still need this call to
    // refresh the minimised status bar so that it looks like the maximised.
    this.manager.cloneStatusbar();
  };
  exports.RecordingIcon = RecordingIcon;
}(window));
