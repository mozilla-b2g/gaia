/* global BaseIcon, SIMSlotManager, RoamingIcon, SignalIcon */
'use strict';

(function(exports) {
  var MobileConnectionIcon = function(manager) {
    this.signals = [];
    this.roamings = [];
    BaseIcon.call(this, manager);
  };
  MobileConnectionIcon.prototype = Object.create(BaseIcon.prototype);
  MobileConnectionIcon.prototype.name = 'MobileConnectionIcon';
  MobileConnectionIcon.prototype._start = function() {
    window.addEventListener('callschanged', this);
  };
  MobileConnectionIcon.prototype._stop = function() {
    window.removeEventListener('callschanged', this);
  };
  MobileConnectionIcon.prototype.handleEvent = function() {
    this.update();
  };
  MobileConnectionIcon.prototype.onrender = function() {
    if (!this.element) {
      return;
    }
    var multipleSims = SIMSlotManager.isMultiSIM();

    // Create signal elements based on the number of SIM slots.
    this.element.dataset.multiple = multipleSims;
    this.updateVisibility = this.updateVisibility.bind(this);
    SIMSlotManager.getSlots().forEach(function(slot, i) {
      this.debug('new ing ' + i + ' signal icon');
      var roaming = new RoamingIcon(slot, i);
      this.roamings.push(roaming);
      roaming.start();
      roaming.element.addEventListener('_shown', this.updateVisibility);
      roaming.element.addEventListener('_hidden', this.updateVisibility);

      var data = new SignalIcon(slot, i);
      this.signals.push(data);
      data.start();
      data.element.addEventListener('_shown', this.updateVisibility);
      data.element.addEventListener('_hidden', this.updateVisibility);
    }, this);
    this.updateVisibility();
  };
  MobileConnectionIcon.prototype.updateVisibility = function() {
    var allAbsent = SIMSlotManager.getSlots().every(function(simslot) {
      return simslot.isAbsent();
    });
    this.element.dataset.multiple = SIMSlotManager.isMultiSIM();
    if (allAbsent) {
      // XXX: show absent icon
      this.debug('Force showing icon at index 0 due to all absent');
      this.element.dataset.multiple = false;
      this.signals[0].show(true);
    }
    var onceVisible = this.signals.some(function(icon) {
      return icon.isVisible();
    });
    if (onceVisible) {
      this.show();
    } else {
      this.hide();
    }
  };
  MobileConnectionIcon.prototype.updateData = function(index) {
    if (!this.signals.length) {
      return;
    }
    if (index) {
      this.signals[index].updateDataText();
      return;
    }
    this.signals.forEach(function(icon) {
      icon.updateDataText();
    });
  };
  MobileConnectionIcon.prototype.update = function(index) {
    if (!this.signals.length) {
      return;
    }
    if (index) {
      this.signals[index].update();
      this.roamings[index].update();
      return;
    }
    this.signals.forEach(function(icon) {
      icon.update();
    });
    this.roamings.forEach(function(icon) {
      icon.update();
    });
  };

  MobileConnectionIcon.prototype.view = function view() {
    return `<div id="statusbar-mobile-connection"
              class="sb-icon-mobile-connection" hidden
              role="presentation">
            </div>`;
  };

  exports.MobileConnectionIcon = MobileConnectionIcon;
}(window));
