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
  exports.NfcIcon = NfcIcon;
}(window));
