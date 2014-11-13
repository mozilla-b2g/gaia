/* global System, BaseUI */
'use strict';

(function(exports) {
  var NetworkActivityIcon = function(manager) {
    this.manager = manager;
  };
  NetworkActivityIcon.prototype = Object.create(BaseUI.prototype);
  NetworkActivityIcon.prototype.constructor = NetworkActivityIcon;
  NetworkActivityIcon.prototype.EVENT_PREFIX = 'NetworkActivityIcon';
  NetworkActivityIcon.prototype.containerElement = document.getElementById('statusbar');
  NetworkActivityIcon.prototype.view = function() {
    /* HACK: We use images instead of divs to enforce allocation of a
             dedicated layer just for this animated icons, remove after
             https://bugzil.la/717872 gets fixed */
    return '<img id="' + this.instanceID + '" ' +
            'src="style/statusbar/images/network-activity.png" ' +
            'class="sb-icon-network-activity" hidden role="listitem" ' +
            'data-l10n-id="statusbarNetworkActivity">';
  };
  NetworkActivityIcon.prototype.instanceID = 'statusbar-network-activity';
  NetworkActivityIcon.prototype._fetchElements = function() {
    this.element = document.getElementById(this.instanceID);
  };
  NetworkActivityIcon.prototype.show = function() {
    var hidden = this.element.hidden;
    if (!hidden) {
      return;
    }
    this.element.hidden = false;
    this.publish('shown');
  };
  NetworkActivityIcon.prototype.hide = function() {
    var hidden = this.element.hidden;
    if (hidden) {
      return;
    }
    this.element.hidden = true;
    this.publish('hidden');
  };
  NetworkActivityIcon.prototype.start = function() {
    window.addEventListener('moznetworkupload', this);
    window.addEventListener('moznetworkdownload', this);
  };
  NetworkActivityIcon.prototype.stop = function() {
    window.removeEventListener('moznetworkupload', this);
    window.removeEventListener('moznetworkdownload', this);
  };
  NetworkActivityIcon.prototype.handleEvent = function() {
    this.update();
  };
  NetworkActivityIcon.prototype.setActive = function(active) {
    this.update();
  };
  NetworkActivityIcon.prototype.isVisible = function() {
    return this.element && !this.element.hidden;
  };
  NetworkActivityIcon.prototype.update = function() {
    // Each time we receive an update, make network activity indicator
    // show up for 500ms.

    var icon = this.element;

    clearTimeout(this._networkActivityTimer);

    this._networkActivityTimer = setTimeout(function hideNetActivityIcon() {
      icon.hidden = true;
      this.manager._updateIconVisibility();
    }.bind(this), 500);

    if (icon.hidden) {
      icon.hidden = false;

      this.manager._updateIconVisibility();
    }
  };
}(window));
