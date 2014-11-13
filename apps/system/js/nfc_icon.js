/* global System, BaseUI */
'use strict';

(function(exports) {
  var NfcIcon = function(manager) {
    this.manager = manager;
  };
  NfcIcon.prototype = Object.create(BaseUI.prototype);
  NfcIcon.prototype.constructor = NfcIcon;
  NfcIcon.prototype.EVENT_PREFIX = 'nfcicon';
  NfcIcon.prototype.containerElement = document.getElementById('statusbar');
  NfcIcon.prototype.view = function() {
    return '<div id="statusbar-nfc" class="sb-icon sb-icon-nfc" hidden ' +
            'role="listitem" data-l10n-id="statusbarNfc"></div>';
  };
  NfcIcon.prototype.instanceID = 'statusbar-nfc';
  NfcIcon.prototype._fetchElements = function() {
    this.element = document.getElementById(this.instanceID);
  };
  NfcIcon.prototype.show = function() {
    var hidden = this.element.hidden;
    if (!hidden) {
      return;
    }
    this.element.hidden = false;
    this.publish('shown');
  };
  NfcIcon.prototype.hide = function() {
    var hidden = this.element.hidden;
    if (hidden) {
      return;
    }
    this.element.hidden = true;
    this.publish('hidden');
  };
  NfcIcon.prototype.start = function() {
    // Listen to Custom event send by 'nfc_manager.js'
    window.addEventListener('nfc-state-changed', this);
    this.update();
  };
  NfcIcon.prototype.stop = function() {
    window.removeEventListener('nfc-state-changed', this)
  };
  NfcIcon.prototype.setActive = function(active) {
    this.update();
  };
  NfcIcon.prototype.isVisible = function() {
    return this.element && !this.element.hidden;
  };
  NfcIcon.prototype.update = function() {
    var icon = this.element;
    icon.hidden = System.query('NfcManager.isActive');

    this.manager.updateIconVisibility();
  };
}(window));
