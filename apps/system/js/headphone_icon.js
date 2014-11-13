/* global System, BaseUI */
'use strict';

(function(exports) {
  var HeadphoneIcon = function(manager) {
    this.manager = manager;
  };
  HeadphoneIcon.prototype = Object.create(BaseUI.prototype);
  HeadphoneIcon.prototype.constructor = HeadphoneIcon;
  HeadphoneIcon.prototype.EVENT_PREFIX = 'HeadphoneIcon';
  HeadphoneIcon.prototype.containerElement = document.getElementById('statusbar');
  HeadphoneIcon.prototype.view = function() {
    return '<div id="' + this.instanceID + '" class="sb-icon sb-icon-headphones" ' +
            'hidden role="listitem" data-l10n-id="statusbarHeadphones"></div>';
  };
  HeadphoneIcon.prototype.instanceID = 'statusbar-headphones';
  HeadphoneIcon.prototype._fetchElements = function() {
    this.element = document.getElementById(this.instanceID);
  };
  HeadphoneIcon.prototype.show = function() {
    var hidden = this.element.hidden;
    if (!hidden) {
      return;
    }
    this.element.hidden = false;
    this.publish('shown');
  };
  HeadphoneIcon.prototype.hide = function() {
    var hidden = this.element.hidden;
    if (hidden) {
      return;
    }
    this.element.hidden = true;
    this.publish('hidden');
  };
  HeadphoneIcon.prototype.start = function() {
    window.addEventListener('mozChromeEvent', this);
  };
  HeadphoneIcon.prototype.stop = function() {
    window.removeEventListener('mozChromeEvent', this);
  };
  HeadphoneIcon.prototype.isVisible = function() {
    return this.element && !this.element.hidden;
  };
  HeadphoneIcon.prototype.handleEvent = function(evt) {
    switch (evt.detail.type) {
      case 'headphones-status-changed':
        this.headphoneActive = (evt.detail.state != 'off');
        this.update();
        break;
    }
  };
  HeadphoneIcon.prototype.update = function() {
    var icon = this.element;
    this.headphoneActive ? this.show() : this.hide();
    this.manager._updateIconVisibility();
  };
  exports.HeadphoneIcon = HeadphoneIcon;
}(window));
