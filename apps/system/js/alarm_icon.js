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

  AlarmIcon.prototype.view = function view() {
    return `<div id="statusbar-alarm"
                class="sb-icon sb-icon-alarm"
                hidden role="listitem"
                data-l10n-id="statusbarAlarm">
            </div>`;
  };

  exports.AlarmIcon = AlarmIcon;
}(window));
