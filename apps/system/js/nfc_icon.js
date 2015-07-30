/* global BaseIcon */
'use strict';

(function(exports) {
  var NfcIcon = function(manager) {
    BaseIcon.call(this, manager);
  };
  NfcIcon.prototype = Object.create(BaseIcon.prototype);
  NfcIcon.prototype.name = 'NfcIcon';
  NfcIcon.prototype.shouldDisplay = function() {
    return this.manager.isActive();
  };

  NfcIcon.prototype.view = function view() {
    return `<div id="statusbar-nfc"
              class="sb-icon sb-icon-nfc" hidden
              role="listitem"
              data-l10n-id="statusbarNfc">
            </div>`;
  };

  exports.NfcIcon = NfcIcon;
}(window));
