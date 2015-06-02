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

  DebuggingIcon.prototype.view = function view() {
    return `<div id="statusbar-debugging"
              data-icon="bug"
              class="sb-icon sb-icon-debugging" hidden
              role="listitem">
            </div>`;
  };

  exports.DebuggingIcon = DebuggingIcon;
}(window));
