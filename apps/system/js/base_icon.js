/* global Service, BaseUI */
'use strict';

(function(exports) {
  function camalToDash(str) {
    var i = 0;
    var ch = '';
    while (i <= strings.length) {
      var character = strings.charAt(i);
      if (character !== character.toLowerCase()) {
        if (ch === '') {
          ch += character.toLowerCase();
        } else {
          ch += '-' + character.toLowerCase();
        }
      } else {
        ch += character;
      }
      i++;
    }
    return ch;
  };
  var BaseIcon = function(manager, index) {
    if (index) {
      this.index = index;
    } else {
      this.index = 0;
    }
    this.amendProperty();
    this.manager = manager;
    this.publish('created');
  };
  BaseIcon.prototype = Object.create(BaseUI.prototype);
  BaseIcon.prototype.constructor = BaseIcon;
  BaseIcon.prototype.amendProperty = function() {
    if (!this.name) {
      console.warn('please specify a name.');
    }
    var pureName = this.name.replace('icon', '');
    if (!this.instanceID) {
      this.instanceID = 'statusbar-' + camalToDash(pureName);
    }
    if (!this.CLASS_LIST) {
      this.CLASS_LIST = 'sb-icon sb-icon-' + camalToDash(pureName);
    }
    if (!this.l10nId) {
      this.l10nId = 'statusbar' + pureName;
    }
  };
  BaseIcon.prototype.EVENT_PREFIX = 'icon';
  BaseIcon.prototype.name = 'BaseIcon';
  BaseIcon.prototype.containerElement = document.getElementById('statusbar');
  // Overload me
  BaseIcon.prototype.instanceID = 'statusbar-base';
  BaseIcon.prototype.additionalProperties = '';
  BaseIcon.prototype.role = 'listitem';
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
  BaseIcon.prototype.render = function() {
    // XXX: To prevent icon ordering regression,
    // we are waiting statusbar rendered and fetch the element here.
    Service.request('Statusbar:getIcon', this.instanceID).then(function(element) {
      this.element = element;
      this.onrender && this.onrender();
    }.bind(this));
  };
  BaseIcon.prototype.start = function() {
    if (this._started) {
      return;
    }
    this._started = true;
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
    Service.registerState('isVisible', this);
    this._start();
    this.render();
  };
  BaseIcon.prototype.onrender = function() {
    this.update();
  };
  BaseIcon.prototype._start = function() {};
  BaseIcon.prototype.stop = function() {
    if (!this._started) {
      return;
    }
    this._started = false;
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
    Service.unregisterState('isVisible', this);
    this._stop();
  };
  BaseIcon.prototype._stop = function() {};
  BaseIcon.prototype.isVisible = function() {
    return this.element && !this.element.hidden;
  };
  BaseIcon.prototype.handleEvent = function(evt) {
    this.processEvent(evt);
    this.update();
  };
  BaseIcon.prototype.processEvent = function() {};
  BaseIcon.prototype.observe = function(key, value) {
    this.storeSettings(key, value);
    this.update();
  };
  BaseIcon.prototype.storeSettings = function(key, value) {
    this._settings[key] = value;
  };
  // Override me
  BaseIcon.prototype.update = function() {
    if (!this._started || !this.element) {
      return;
    }
    this.determine() ? this.show() : this.hide();
  };
  BaseIcon.prototype.enabled = function() {
    return this._started;
  };
  BaseIcon.prototype.updateLabel = function(type, active) {
    if (!this.element && !this.isVisible()) {
      return;
    }
    this.element.setAttribute('aria-label', navigator.mozL10n.get((active ?
      'statusbarIconOnActive-' : 'statusbarIconOn-') + type));
  };
  // Override me
  BaseIcon.prototype.determine = function() {};
}(window));
