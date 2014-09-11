/* global VersionHelper, SIMSlotManager, System, FtuLauncher */
'use strict';

(function(exports) {
  var SimLock = function(core) {
    this.mobileConnections = core.mobileConnections;
  };
  SimLock.EVENTS = [
    'ftuopen',
    'appopened',
    'lockscreen-request-unlock',
    'simslot-cardstatechange',
    'simslot-iccinfochange',
    'attentionopening',
    'attentionterminated',
    'simpinskip',
    'simpinback',
    'simpinrequestclose'
  ];
  SimLock.SUB_MODULES = [
    'SimLockSystemDialog'
  ];
  System.create(SimLock, {}, {
    name: 'SimLockManager',
    _duringCall: false,
    _showPrevented: false,

    _onSubModuleInited: function() {
      this.showIfLocked();
    },

    '_handle_simslot-iccinfochange': function(evt) {
      this.showIfLocked(evt.detail.index);
    },

    '_handle_simslot-cardstatechange': function(evt) {
      this.showIfLocked(evt.detail.index);
    },

    '_handle_ftuopen': function() {
      VersionHelper.getVersionInfo().then(function(info) {
        if (!info.isUpgrade()) {
          this.simLockSystemDialog.close();
        }
      }.bind(this));
    },

    _handle_simpinback: function(evt) {
      var index = evt.detail._currentSlot.index;
      this.showIfLocked(index - 1);
    },

    _handle_simpinskip: function(evt) {
      var index = evt.detail._currentSlot.index;
      if (index + 1 >= this.mobileConnections.length - 1) {
        evt.detail.close('skip');
      } else {
        if (!this.showIfLocked(index + 1, true)) {
          evt.detail.close('skip');
        }
      }
    },

    _handle_simpinrequestclose: function(evt) {
      var index = evt.detail.dialog._currentSlot.index;
      if (index + 1 >= this.mobileConnections.length - 1) {
        evt.detail.dialog.close(evt.detail.reason);
      } else {
        if (!this.showIfLocked(index + 1, true)) {
          evt.detail.dialog.close(evt.detail.reason);
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
      // the value of System.locked in showIfLocked method.
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

      // Ignore first time usage (FTU) app which already asks for the PIN code
      // XXX: We should have a better way to detect this app is FTU or not.
      if (app.origin == FtuLauncher.getFtuOrigin()) {
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

    showIfLocked: function sl_showIfLocked(currentSlotIndex, skipped) {
      if (!this.simLockSystemDialog) {
        this.debug('Dialog not ready.');
        return false;
      }

      if (System.locked) {
        this.debug('Lockscreen is on so hidden.');
        return false;
      }

      if (this.simLockSystemDialog.visible) {
        this.debug('Already displayed.');
        return false;
      }

      // FTU has its specific SIM PIN UI
      if (System.runningFTU && !System.isUpgrading()) {
        this.debug('Running full ftu.');
        this.simLockSystemDialog.close();
        return false;
      }

      if (this._duringCall) {
        this.debug('During call');
        this._showPrevented = true;
        return false;
      }

      return SIMSlotManager.getSlots().some(function iterator(slot, index) {
        if (currentSlotIndex && index !== currentSlotIndex) {
          return false;
        }

        if (!slot.simCard) {
          this.debug('No SIM card in slot ' + (index + 1));
          return false;
        }

        switch (slot.simCard.cardState) {
          // do nothing in either unknown or null card states
          case null:
          case 'unknown':
            this.debug('unknown SIM card state for slot ' + (index + 1));
            break;
          case 'pukRequired':
          case 'pinRequired':
            this.simLockSystemDialog.show(slot, skipped);
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
            return true;
          default:
            this.debug('SIM slot ' + (index + 1) + ' is not locked, skipping');
            return false;
        }
      }, this);
    }
  });
  exports.SimLock = SimLock;
}(window));

