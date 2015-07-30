/* global BaseIcon, SIMSlotManager */
'use strict';

(function(exports) {
  var CallForwardingIcon = function(manager, index, container) {
    BaseIcon.call(this, manager, index);
    this.instanceID = this.instanceID + index;
    this.containerElement = container;
  };
  CallForwardingIcon.prototype = Object.create(BaseIcon.prototype);
  CallForwardingIcon.prototype.name = 'CallForwardingIcon';
  CallForwardingIcon.prototype.EVENT_PREFIX = 'subicon';
  CallForwardingIcon.prototype.shouldDisplay = function() {
    return this.manager.enabled(this.index);
  };
  CallForwardingIcon.prototype.name = 'CallForwardingIcon';
  CallForwardingIcon.prototype.view = function() {
    var index = this.index;
    var content = `
      <div class="sb-icon sb-icon-call-forwarding"
       role="listitem" data-index="${index}"
       aria-label="statusbarForwarding">
      </div>`;
    return content;
  };

  CallForwardingIcon.prototype.render = function() {
    this.debug('renderring...');
    this.containerElement.insertAdjacentHTML('beforeend', this.view());
    this.element =
      this.containerElement.querySelector(
        '.sb-icon-call-forwarding[data-index="' +
        this.index + '"]');
  };

  var CallForwardingsIcon = function(manager) {
    this.icons = [];
    BaseIcon.call(this, manager);
  };
  CallForwardingsIcon.prototype = Object.create(BaseIcon.prototype);
  CallForwardingsIcon.prototype.name = 'CallForwardingsIcon';
  CallForwardingsIcon.prototype.onrender = function() {
    if (!this.element) {
      return;
    }
    var multipleSims = SIMSlotManager.isMultiSIM();

    // Create signal elements based on the number of SIM slots.
    this.element.dataset.multiple = multipleSims;
    this.updateVisibility = this.updateVisibility.bind(this);
    SIMSlotManager.getSlots().forEach(function(slot, i) {
      var icon = new CallForwardingIcon(this.manager, i, this.containerElement);
      this.icons.push(icon);
      icon.start();
      icon.element.addEventListener('_shown', this.updateVisibility);
      icon.element.addEventListener('_hidden', this.updateVisibility);
    }, this);
    this.updateVisibility();
  };
  CallForwardingsIcon.prototype.updateVisibility = function() {
    var visible = this.icons.some(function(icon) {
      return icon.isVisible();
    });
    visible ? this.show() : this.hide();
  };
  CallForwardingsIcon.prototype.update = function() {
    if (!this.icons.length) {
      return;
    }
    this.icons.forEach(function(icon) {
      icon.update();
    });
  };

  CallForwardingsIcon.prototype.view = function view() {
    return `<div id="statusbar-call-forwardings"
              class="sb-icon-call-forwarding"
              hidden role="presentation">
            </div>`;
  };

  exports.CallForwardingsIcon = CallForwardingsIcon;
}(window));
