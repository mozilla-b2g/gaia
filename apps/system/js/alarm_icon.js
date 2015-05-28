/* global BaseIcon */
'use strict';

(function(exports) {
  var AlarmIcon = function(manager) {
    BaseIcon.call(this, manager);
  };
  AlarmIcon.prototype = Object.create(BaseIcon.prototype);
  AlarmIcon.prototype.name = 'AlarmIcon';
  AlarmIcon.prototype.shouldDisplay = function() {
    return this.manager.enabled;
  };
  exports.AlarmIcon = AlarmIcon;
}(window));
