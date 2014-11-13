/* global System, BaseUI */
'use strict';

(function(exports) {
  var MuteIcon = function(manager) {
    this.manager = manager;
  };
  MuteIcon.prototype = Object.create(BaseUI.prototype);
  MuteIcon.prototype.constructor = MuteIcon;
  MuteIcon.prototype.EVENT_PREFIX = 'MuteIcon';
  MuteIcon.prototype.containerElement = document.getElementById('statusbar');
  MuteIcon.prototype.view = function() {
    return '<div id="statusbar-mute" class="sb-icon sb-icon-mute" hidden role="listitem"></div>';
  };
  MuteIcon.prototype.instanceID = 'statusbar-mute';
  MuteIcon.prototype._fetchElements = function() {
    this.element = document.getElementById(this.instanceID);
  };
  MuteIcon.prototype.show = function() {
    var hidden = this.element.hidden;
    if (!hidden) {
      return;
    }
    this.element.hidden = false;
    this.publish('shown');
  };
  MuteIcon.prototype.hide = function() {
    var hidden = this.element.hidden;
    if (hidden) {
      return;
    }
    this.element.hidden = true;
    this.publish('hidden');
  };
  MuteIcon.prototype.start = function() {
    this._settings = {};
    System.request('addObserver', 'vibration.enabled', this);
    System.request('addObserver', 'audio.volume.notification', this);
  };
  MuteIcon.prototype.stop = function() {
    System.request('removeObserver', 'vibration.enabled', this);
    System.request('removeObserver', 'audio.volume.notification', this);
  };
  MuteIcon.prototype.isVisible = function() {
    return this.element && !this.element.hidden;
  };
  MuteIcon.prototype.observe = function(key, value) {
    this._settings[key] = value;
  };
  MuteIcon.prototype.updateLabel = function(type, active) {
    if (this.element.hidden) {
      return;
    }
    this.element.setAttribute('aria-label', navigator.mozL10n.get((active ?
      'statusbarIconOnActive-' : 'statusbarIconOn-') + type));
  },
  MuteIcon.prototype.update = function() {
    var icon = this.element;
    icon.hidden = (this._settings['audio.volume.notification'] !== 0);

    var vibrate = (this._settings['vibration.enabled'] === true);
    if (vibrate) {
      icon.classList.add('vibration');
    } else {
      icon.classList.remove('vibration');
    }
    this.updateLabel((this._settings['vibration.enabled'] === true) ?
      'vibration' : 'mute');
    this.manager._updateIconVisibility();
  };
  exports.MuteIcon = MuteIcon;
}(window));
