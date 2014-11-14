/* global Service, BaseUI */
'use strict';

(function(exports) {
  var BaseIcon = function(manager) {
    this.manager = manager;
  };
  BaseIcon.prototype = Object.create(BaseUI.prototype);
  BaseIcon.prototype.constructor = BaseIcon;
  BaseIcon.prototype.EVENT_PREFIX = 'icon';
  BaseIcon.prototype.containerElement = document.getElementById('statusbar');
  // Overload me
  BaseIcon.prototype.view = function() {
    return '<div id="' + instanceID + '" class="' + this.CLASS_LIST + ' hidden ' +
            'role="listitem" data-l10n-id="' + this.l10nId + '"></div>';
  };
  BaseIcon.prototype.instanceID = 'statusbar-base';
  BaseIcon.prototype._fetchElements = function() {
    this.element = document.getElementById(this.instanceID);
  };
  BaseIcon.prototype.show = function() {
    var hidden = this.element.hidden;
    if (!hidden) {
      return;
    }
    this.element.hidden = false;
    this.publish('shown');
  };
  BaseIcon.prototype.hide = function() {
    var hidden = this.element.hidden;
    if (hidden) {
      return;
    }
    this.element.hidden = true;
    this.publish('hidden');
  };
  BaseIcon.prototype.start = function() {
    this._settings = {};
    if (this.constructor.REGISTERED_EVENTS) {
      this.constructor.REGISTERED_EVENTS.forEach(function(evt) {
        window.addEventListener(evt, this);
      }, this);
    }
    if (this.constructor.OBSERVED_SETTINGS) {
      this.constructor.OBSERVED_SETTINGS.forEach(function(key) {
        Service.request('addObserver', key, this);
      }, this);
    }
    this._start();
    this.update();
  };
  BaseIcon.prototype._start = function() {};
  BaseIcon.prototype.stop = function() {
    if (this.constructor.REGISTERED_EVENTS) {
      this.constructor.REGISTERED_EVENTS.forEach(function(evt) {
        window.removeEventListener(evt, this);
      }, this);
    }
    if (this.constructor.OBSERVED_SETTINGS) {
      this.constructor.OBSERVED_SETTINGS.forEach(function(key) {
        Service.request('removeObserver', key, this);
      }, this);
    }
    this._stop();
  };
  BaseIcon.prototype._stop = function() {};
  BaseIcon.prototype.isVisible = function() {
    return this.element && !this.element.hidden;
  };
  BaseIcon.prototype.handleEvent = function(evt) {
    this.processEvent(evt);
    this.update();
    this.notifyUpdate();
  };
  BaseIcon.prototype.processEvent = function() {};
  BaseIcon.prototype.observe = function(key, value) {
    this.storeSettings(key, value);
    this.update();
    this.notifyUpdate();
  };
  BaseIcon.prototype.storeSettings = function(key, value) {
    this._settings[key] = value;
  };
  // Override me
  BaseIcon.prototype.update = function() {
  };
  BaseIcon.prototype.notifyUpdate = function() {
    this.manager._updateIconVisibility();
  };
}(window));
