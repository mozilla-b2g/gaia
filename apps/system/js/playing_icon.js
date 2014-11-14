/* global BaseIcon */
'use strict';

(function(exports) {
  var PlayingIcon = function(manager) {
    this.manager = manager;
  };
  PlayingIcon.prototype = Object.create(BaseIcon.prototype);
  PlayingIcon.prototype.constructor = PlayingIcon;
  PlayingIcon.prototype.CLASS_LIST = 'sb-icon sb-icon-playing';
  PlayingIcon.prototype.l10nId = 'statusbarPlaying';
  PlayingIcon.prototype.instanceID = 'statusbar-playing';
  PlayingIcon.REGISTERED_EVENTS = [ 'audio-channel-changed' ];
  PlayingIcon.prototype.processEvent = function(evt) {
    this.playingActive = evt.detail === 'content';
  };
  PlayingIcon.prototype.update = function() {
    var icon = this.element;
    // The camera recording fires a audio-channel-changed event to kill
    // existing "content" audio channels, in this case we don't show the
    // playing icon.
    this.playingActive && !this.manager.recordingIcon.isVisible() ?
      this.show() : this.hide();
  };
  exports.PlayingIcon = PlayingIcon;
}(window));
