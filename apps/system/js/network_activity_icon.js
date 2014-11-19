/* global BaseIcon */
'use strict';

(function(exports) {
  var NetworkActivityIcon = function() {};
  NetworkActivityIcon.prototype = Object.create(BaseIcon.prototype);
  NetworkActivityIcon.prototype.name = 'NetworkActivityIcon';
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

    if (!this.isVisible()) {
      this.show();
    }
  };
  exports.NetworkActivityIcon = NetworkActivityIcon;
}(window));
