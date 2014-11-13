/* global System, BaseUI */
'use strict';

(function(exports) {
  var PlayingIcon = function(manager) {
    this.manager = manager;
  };
  PlayingIcon.prototype = Object.create(BaseUI.prototype);
  PlayingIcon.prototype.constructor = PlayingIcon;
  PlayingIcon.prototype.EVENT_PREFIX = 'PlayingIcon';
  PlayingIcon.prototype.containerElement = document.getElementById('statusbar');
  PlayingIcon.prototype.view = function() {
    return '<div id="' + this.instanceID + '" class="sb-icon sb-icon-playing" ' +
            'hidden role="listitem" data-l10n-id="statusbarPlaying"></div>';
  };
  PlayingIcon.prototype.instanceID = 'statusbar-playing';
  PlayingIcon.prototype._fetchElements = function() {
    this.element = document.getElementById(this.instanceID);
  };
  PlayingIcon.prototype.show = function() {
    var hidden = this.element.hidden;
    if (!hidden) {
      return;
    }
    this.element.hidden = false;
    this.publish('shown');
  };
  PlayingIcon.prototype.hide = function() {
    var hidden = this.element.hidden;
    if (hidden) {
      return;
    }
    this.element.hidden = true;
    this.publish('hidden');
  };
  PlayingIcon.prototype.start = function() {
    window.addEventListener('mozChromeEvent', this);
  };
  PlayingIcon.prototype.stop = function() {
    window.removeEventListener('mozChromeEvent', this);
  };
  PlayingIcon.prototype.isVisible = function() {
    return this.element && !this.element.hidden;
  };
  PlayingIcon.prototype.handleEvent = function(evt) {
    switch (evt.detail.type) {
      case 'audio-channel-changed':
        // The camera recording fires a audio-channel-changed event to kill
        // existing "content" audio channels, in this case we don't show the
        // playing icon.
        var active = evt.detail.channel === 'content' &&
          !this.manager.recordingIcon.isVisible();
        if (this.playingActive === active) {
          break;
        }
        this.playingActive = active;
        this.update();
        break;
    }
  };
  PlayingIcon.prototype.update = function() {
    var icon = this.element;
    this.playingActive ? this.show() : this.hide();
    this.manager._updateIconVisibility();
  };
  exports.PlayingIcon = PlayingIcon;
}(window));
