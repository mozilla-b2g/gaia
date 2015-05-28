/* global BaseIcon */
'use strict';

(function(exports) {
  var DebuggingIcon = function(manager) {
    BaseIcon.call(this, manager);
  };
  DebuggingIcon.prototype = Object.create(BaseIcon.prototype);
  DebuggingIcon.prototype.name = 'DebuggingIcon';
  DebuggingIcon.prototype.shouldDisplay = function() {
    return this.manager.enabled;
  };
  exports.DebuggingIcon = DebuggingIcon;
}(window));
