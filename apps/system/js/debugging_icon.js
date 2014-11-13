/* global System, BaseUI */
'use strict';

(function(exports) {
  var DebuggingIcon = function(manager) {
    this.manager = manager;
  };
  DebuggingIcon.prototype = Object.create(BaseUI.prototype);
  DebuggingIcon.prototype.constructor = DebuggingIcon;
  DebuggingIcon.prototype.EVENT_PREFIX = 'DebuggingIcon';
  DebuggingIcon.prototype.containerElement = document.getElementById('statusbar');
  DebuggingIcon.prototype.view = function() {
    return '<div id="' + this.instanceID + '" data-icon="bug" ' +
            'class="sb-icon sb-icon-debugging" hidden role="listitem"></div>';
  };
  DebuggingIcon.prototype.instanceID = 'statusbar-debugging';
  DebuggingIcon.prototype._fetchElements = function() {
    this.element = document.getElementById(this.instanceID);
  };
  DebuggingIcon.prototype.show = function() {
    var hidden = this.element.hidden;
    if (!hidden) {
      return;
    }
    this.element.hidden = false;
    this.publish('shown');
  };
  DebuggingIcon.prototype.hide = function() {
    var hidden = this.element.hidden;
    if (hidden) {
      return;
    }
    this.element.hidden = true;
    this.publish('hidden');
  };
  DebuggingIcon.prototype.start = function() {
    this._settings = {};
    System.request('addObserver', 'debugger.remote-mode', this);
  };
  DebuggingIcon.prototype.stop = function() {
    System.request('removeObserver', 'debugger.remote-mode', this);
  };
  DebuggingIcon.prototype.isVisible = function() {
    return this.element && !this.element.hidden;
  };
  DebuggingIcon.prototype.observe = function(key, value) {
    this._settings[key] = value;
    this.update();
  };
  DebuggingIcon.prototype.update = function() {
    var icon = this.element;
    this._settings['debugger.remote-mode'] == 'disabled' ? this.hide() : this.show();
    this.manager._updateIconVisibility();
  };
  exports.DebuggingIcon = DebuggingIcon;
}(window));
