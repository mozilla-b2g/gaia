/* global BaseIcon */
'use strict';

(function(exports) {
  var HeadphoneIcon = function(manager) {
    BaseIcon.call(this, manager);
  };
  HeadphoneIcon.prototype = Object.create(BaseIcon.prototype);
  HeadphoneIcon.prototype.name = 'HeadphoneIcon';
  HeadphoneIcon.prototype.shouldDisplay = function() {
    return this.manager.isHeadsetConnected;
  };

  HeadphoneIcon.prototype.view = function view() {
    return `<div id="statusbar-headphone"
              class="sb-icon sb-icon-headphone"
              hidden role="listitem"
              data-l10n-id="statusbarHeadphone">
            </div>`;
  };

  exports.HeadphoneIcon = HeadphoneIcon;
}(window));
