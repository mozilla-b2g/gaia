/* global BaseIcon */
'use strict';

(function(exports) {
  var NetworkActivityIcon = function() {};
  NetworkActivityIcon.prototype = Object.create(BaseIcon.prototype);
  NetworkActivityIcon.prototype.name = 'NetworkActivityIcon';
  NetworkActivityIcon.prototype.view = function() {
    /* HACK: We use images instead of divs to enforce allocation of a
             dedicated layer just for this animated icons, remove after
             https://bugzil.la/717872 gets fixed */
    return '<img id="' + this.instanceID + '" ' +
            'src="style/statusbar/images/network-activity.png" ' +
            'class="sb-icon-network-activity" hidden role="listitem" ' +
            'data-l10n-id="statusbarNetworkActivity">';
  };
  NetworkActivityIcon.prototype.update = function() {
    // Each time we receive an update, make network activity indicator
    // show up for 500ms.
    var icon = this.element;
    if (!icon) {
      return;
    }

    clearTimeout(this._networkActivityTimer);

    this._networkActivityTimer = setTimeout(function hideNetActivityIcon() {
      this.hide();
    }.bind(this), 500);

    if (icon.hidden) {
      this.show();
    }
  };
  exports.NetworkActivityIcon = NetworkActivityIcon;
}(window));
