/* global BaseIcon */
'use strict';

(function(exports) {
  var NetworkActivityIcon = function(manager) {
    BaseIcon.call(this, manager);
  };
  NetworkActivityIcon.prototype = Object.create(BaseIcon.prototype);
  NetworkActivityIcon.prototype.name = 'NetworkActivityIcon';
  NetworkActivityIcon.prototype.kActiveIndicatorTimeout = 500;
  NetworkActivityIcon.prototype.UPDATE_ON_START = false;
  NetworkActivityIcon.prototype.update = function() {
    // Each time we receive an update, make network activity indicator
    // show up for 500ms.
    var icon = this.element;
    if (!icon || !this.enabled()) {
      return;
    }

    clearTimeout(this._networkActivityTimer);

    this._networkActivityTimer = setTimeout(function hideNetActivityIcon() {
      this.hide();
    }.bind(this), this.kActiveIndicatorTimeout);

    if (!this.isVisible()) {
      this.show();
    }
  };
  exports.NetworkActivityIcon = NetworkActivityIcon;
}(window));
