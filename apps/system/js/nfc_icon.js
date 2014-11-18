/* global System, BaseIcon */
'use strict';

(function(exports) {
  var NfcIcon = function() {};
  NfcIcon.prototype = Object.create(BaseIcon.prototype);
  NfcIcon.prototype.name = 'NfcIcon';
  NfcIcon.prototype.determine = function() {
    return this.manager.isActive();
  };
  exports.NfcIcon = NfcIcon;
}(window));
