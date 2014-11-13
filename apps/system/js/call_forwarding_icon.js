/* global System, BaseUI, SIMSlotManager */
'use strict';

(function(exports) {
  var CallForwardingIcon = function(manager) {
    this.manager = manager;
  };
  CallForwardingIcon.prototype = Object.create(BaseUI.prototype);
  CallForwardingIcon.prototype.constructor = CallForwardingIcon;
  CallForwardingIcon.prototype.EVENT_PREFIX = 'CallForwardingIcon';
  CallForwardingIcon.prototype.containerElement = document.getElementById('statusbar');
  CallForwardingIcon.prototype.view = function() {
    return '<div id="statusbar-call-forwardings" class="sb-icon-call-forwardings" hidden ' +
            'role="presentation"></div>'
  };
  CallForwardingIcon.prototype.instanceID = 'statusbar-call-forwardings';
  CallForwardingIcon.prototype._fetchElements = function() {
    this.element = document.getElementById(this.instanceID);
  };
  CallForwardingIcon.prototype.createElements = function() {
    if (this.element) {
      return;
    }
    var conns = window.navigator.mozMobileConnections;
    if (conns) {
      var multipleSims = SIMSlotManager.isMultiSIM();

      // Create call forwarding icons
      var sbCallForwardings = this.element;
      sbCallForwardings.dataset.multiple = multipleSims;
      this.icons.callForwardingsElements = {};
      for (var idx = conns.length - 1; idx >= 0; idx--) {
        var callForwarding = document.createElement('div');
        callForwarding.className = 'sb-icon sb-icon-call-forwarding';
        if (multipleSims) {
          callForwarding.dataset.index = idx + 1;
        }
        callForwarding.setAttribute('role', 'listitem');
        callForwarding.setAttribute('aria-label', 'statusbarForwarding');
        callForwarding.hidden = true;
        this.element.appendChild(callForwarding);
        this.callForwardingsElements[idx] = callForwarding;
      }

      this.updateCallForwardingsVisibility();
    }
  };
  CallForwardingIcon.prototype.show = function() {
    var hidden = this.element.hidden;
    if (!hidden) {
      return;
    }
    this.element.hidden = false;
    this.publish('shown');
  };
  CallForwardingIcon.prototype.hide = function() {
    var hidden = this.element.hidden;
    if (hidden) {
      return;
    }
    this.element.hidden = true;
    this.publish('hidden');
  };
  CallForwardingIcon.prototype.start = function() {
    window.addEventListener('call-forwarding-enabled', this);
    window.addEventListener('call-forwarding-disabled', this);
    this.update();
  };
  CallForwardingIcon.prototype.stop = function() {
    window.removeEventListener('call-forwarding-enabled', this)
    window.removeEventListener('call-forwarding-disabled', this);
  };
  CallForwardingIcon.prototype.setActive = function(active) {
    this.update();
  };
  CallForwardingIcon.prototype.isVisible = function() {
    return this.element && !this.element.hidden;
  };
  CallForwardingIcon.prototype.handleEvent = function() {
    this.update();
  };
  CallForwardingIcon.prototype.update = function() {
    var icons = this.callForwardingsElements;
    var states = System.query('CallForwarding.enabled');
    if (states) {
      states.forEach(function(state, index) {
        icons[index].hidden = !state;
      });
    }
    this.updateCallForwardingsVisibility();
    this.manager._updateIconVisibility();
  };
  CallForwardingIcon.prototype.updateCallForwardingsVisibility = function() {
    // Iterate through connections children and show the container if at least
    // one of them is visible.
    var conns = window.navigator.mozMobileConnections;
    var icons = this.callForwardingsElements;
    for (var index = 0; index < conns.length; index++) {
      if (!icons[index].hidden) {
        icons.hidden = false;
        return;
      }
    }
    this.hide();
  },
}(window));
