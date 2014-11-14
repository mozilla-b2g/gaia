/* global System, BaseIcon */
'use strict';

(function(exports) {
  var NfcIcon = function(manager) {
    this.manager = manager;
  };
  NfcIcon.prototype = Object.create(BaseIcon.prototype);
  NfcIcon.prototype.constructor = NfcIcon;
  NfcIcon.prototype.view = function() {
    return '<div id="' + this.instanceID + '" class="sb-icon sb-icon-nfc" hidden ' +
            'role="listitem" data-l10n-id="statusbarNfc"></div>';
  };
  NfcIcon.prototype.instanceID = 'statusbar-nfc';
  NfcIcon.prototype.start = function() {
    window.addEventListener('nfc-state-changed', this);
    this.update();
  };
  NfcIcon.prototype.stop = function() {
    window.removeEventListener('nfc-state-changed', this)
  };
  NfcIcon.prototype.update = function() {
    var icon = this.element;
    icon.hidden = System.query('NfcManager.isActive');
  };
}(window));
