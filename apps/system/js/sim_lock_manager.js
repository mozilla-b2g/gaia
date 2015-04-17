/* global SIMSlotManager, Service, BaseModule, applications */
'use strict';

(function(exports) {
  var SimLockManager = function(core) {
    this.mobileConnections = core.mobileConnections;
  };
  SimLockManager.EVENTS = [
    'simslotready',
    'ftuopen',
    'appopened',
    'lockscreen-request-unlock',
    'simslot-updated',
    'simslot-cardstatechange',
    'simslot-iccinfochange',
    'attentionopening',
    'attentionterminated',
    'simlockskip',
    'simlockback',
    'simlockrequestclose',
    'airplanemode-enabled'
  ];
  SimLockManager.SUB_MODULES = [
    'SimLockSystemDialog'
  ];
  BaseModule.create(SimLockManager, {
    name: 'SimLockManager',
    _duringCall: false,
    _showPrevented: false,
    _alreadyShown: false,

    _handle_simslotready: function() {
      this.showIfLocked();
    },

    _sim_lock_system_dialog_loaded: function() {
      this.showIfLocked();
    },

    '_handle_simslot-updated': function(evt) {
      this.showIfLocked(evt.detail.index);
    },

    '_handle_simslot-iccinfochange': function(evt) {
      this.showIfLocked(evt.detail.index);
    },

    '_handle_simslot-cardstatechange': function(evt) {
      this.showIfLocked(evt.detail.index);
    },

    '_handle_ftuopen': function() {
      if (this.service.query('isFtuUpgrading') === false) {
        this.simLockSystemDialog.close();
      } else {
        this.showIfLocked();
      }
    },

    _handle_simlockback: function(evt) {
      var index = evt.detail._currentSlot.index;
      this.showIfLocked(index - 1, false);
    },

    _handle_simlockskip: function(evt) {
      var index = evt.detail._currentSlot.index;
      if (index + 1 > this.mobileConnections.length - 1) {
        evt.detail.close('skip');
      } else {
        if (!this.showIfLocked(index + 1, true)) {
          evt.detail.close('skip');
        }
      }
    },

    _handle_simlockrequestclose: function(evt) {
      var index = evt.detail._currentSlot.index;
      if (index + 1 > this.mobileConnections.length - 1) {
        evt.detail.close();
      } else {
        if (!this.showIfLocked(index + 1, false)) {
          evt.detail.close();
        }
      }
    },

    _handle_attentionopening: function(evt) {
      if (evt.detail.CLASS_NAME !== 'CallscreenWindow') {
        return;
      }
      this._duringCall = true;
    },

    _handle_attentionterminated: function(evt) {
      if (evt.detail.CLASS_NAME !== 'CallscreenWindow') {
        return;
      }
      this._duringCall = false;
      if (this._showPrevented) {
        this._showPrevented = false;

        // We show the SIM dialog right away otherwise the user won't
        // be able to receive calls.
        this.showIfLocked();
      }
    },

    '_handle_lockscreen-request-unlock': function(evt) {
      // Check whether the lock screen was unlocked from the camera or not.
      // If the former is true, the SIM PIN dialog should not displayed after
      // unlock, because the camera will be opened (Bug 849718)
      if (evt.detail && evt.detail.activity &&
          'record' === evt.detail.activity.name) {
        this.simLockSystemDialog.close();
        return;
      }
      var self = this;
      // We should wait for lockscreen-appclosed event sent before checking
      // the value of Service.query('locked') in showIfLocked method.
      window.addEventListener('lockscreen-appclosed',
        function lockscreenOnClosed() {
          window.removeEventListener('lockscreen-appclosed',
            lockscreenOnClosed);
          self.showIfLocked();
        });
    },

    _handle_appopened: function(evt) {
      // If an app needs 'telephony' or 'sms' permissions (i.e. mobile
      // connection) and the SIM card is locked, the SIM PIN unlock screen
      // should be launched

      var app = evt.detail;

      if (!app || !app.manifest || !app.manifest.permissions) {
        return;
      }

      // Ignore apps that don't require a mobile connection
      if (!('telephony' in app.manifest.permissions ||
            'sms' in app.manifest.permissions)) {
        return;
      }

      // If the Settings app will open, don't prompt for SIM PIN entry
      // although it has 'telephony' permission (Bug 861206)
      var settingsManifestURL =
        'app://settings.gaiamobile.org/manifest.webapp';
      if (app.manifestURL == settingsManifestURL) {
        if (this.simLockSystemDialog.visible) {
          this.simLockSystemDialog.close();
        }
        return;
      }

      // If SIM is locked, cancel app opening in order to display
      // it after the SIM PIN dialog is shown
      this.showIfLocked();
      // XXX: We don't block the app from launching if it requires SIM
      // but only put the SIM PIN dialog upon the opening/opened app.
      // Will revisit this in
      // https://bugzilla.mozilla.org/show_bug.cgi?id=SIMPIN-Dialog
    },

    '_handle_airplanemode-enabled': function(evt) {
      this.simLockSystemDialog.close();
      this._alreadyShown = false;
    },

    isBothSlotsLocked: function sl_isBothSlotsLocked() {
      if (!SIMSlotManager.isMultiSIM() ||
          SIMSlotManager.hasOnlyOneSIMCardDetected()) {
        return false;
      }

      var simSlots = SIMSlotManager.getSlots();
      var isBothLocked = true;
      for (var i = 0; i < simSlots.length; i++) {
        var currentSlot = simSlots[i];
        var unknownState = currentSlot.isUnknownState();
        var currentLocked = currentSlot.isLocked() || unknownState;
        isBothLocked = isBothLocked && currentLocked;
      }
      return isBothLocked;
    },

    showIfLocked: function sl_showIfLocked(currentSlotIndex, skipped) {
      if (!SIMSlotManager.ready) {
        this.warn('SIMSlot not ready yet.');
        return false;
      }

      if (!this.simLockSystemDialog) {
        this.warn('dialog not ready.');
        return false;
      }

      if (Service.query('locked')) {
        this.warn('Lockscreen is on so hidden.');
        return false;
      }

      if (currentSlotIndex === null && this.simLockSystemDialog.visible) {
        this.warn('Already displayed.');
        return false;
      }

      // FTU has its specific SIM PIN UI
      if (this.service.query('isFtuRunning') &&
          !this.service.query('isFtuUpgrading')) {
        this.warn('Running full ftu.');
        this.simLockSystemDialog.close();
        return false;
      }

      if (this._duringCall) {
        this.warn('During call');
        this._showPrevented = true;
        return false;
      }

      if (!applications.ready) {
        return false;
      }

      return SIMSlotManager.getSlots().some(function iterator(slot, index) {
        // If currentSlotIndex is present then we just need to handle this slot
        if (currentSlotIndex && index !== currentSlotIndex) {
          return false;
        }

        if (!slot.simCard) {
          this.warn('No SIM card in slot ' + (index + 1));
          return false;
        }

        // Only render if not already displaying, or
        // displaying and skipping
        if (skipped == null && this.simLockSystemDialog.visible) {
          return false;
        }

        // Always showing the first slot first.
        if (!this._alreadyShown && this.isBothSlotsLocked() && index > 0) {
          return false;
        }

        switch (slot.getCardState()) {
          // do nothing in either unknown or null card states
          case null:
          case 'unknown':
            this.warn('unknown SIM card state for slot ' + (index + 1));
            break;
          case 'pukRequired':
          case 'pinRequired':
            this.simLockSystemDialog.show(slot, skipped);
            this._alreadyShown = true;
            return true;
          case 'networkLocked':
          case 'corporateLocked':
          case 'serviceProviderLocked':
          case 'network1Locked':
          case 'network2Locked':
          case 'hrpdNetworkLocked':
          case 'ruimCorporateLocked':
          case 'ruimServiceProviderLocked':
            this.simLockSystemDialog.show(slot, skipped);
            this._alreadyShown = true;
            return true;
          default:
            this.warn('SIM slot ' + (index + 1) + ' is not locked, skipping');
            return false;
        }
      }, this);
    }
  });
}());

