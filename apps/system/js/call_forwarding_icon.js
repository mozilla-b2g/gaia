/* global System, BaseUI, SIMSlotManager */
'use strict';

(function(exports) {
  var CallForwardingIcon = function() {};
  CallForwardingIcon.prototype = Object.create(BaseIcon.prototype);
  CallForwardingIcon.prototype.name = 'CallForwardingIcon';
  CallForwardingIcon.prototype.additionalProperties = 'aria-label=statusbarForwarding';
  CallForwardingIcon.prototype.determine = function() {
    return this.manager.enabled[this.index];
  };
  exports.CallForwardingIcon = CallForwardingIcon;
}(window));
