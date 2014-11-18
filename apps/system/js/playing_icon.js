/* global BaseIcon */
'use strict';

(function(exports) {
  var PlayingIcon = function() {};
  PlayingIcon.prototype = Object.create(BaseIcon.prototype);
  PlayingIcon.prototype.name = 'PlayingIcon';
  PlayingIcon.prototype.determine = function() {
    // The camera recording fires a audio-channel-changed event to kill
    // existing "content" audio channels, in this case we don't show the
    // playing icon.
    return this.manager.currentChannel === 'content' &&
           !Service.query('RecordingIcon.isVisible');
  };
  exports.PlayingIcon = PlayingIcon;
}(window));
