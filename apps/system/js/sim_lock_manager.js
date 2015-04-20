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
    'lockscreen-appclosed',
    'lockscreen-appopened',
    'simslot-cardstatechange',
    'simslot-iccinfochange',
    'attentionopening',
    'attentionterminated',
    'simlockskip',
    'simlockback',
    'simlockrequestclose',
    'airplanemode-enabled',
    'simslot-updated'
  ];

  SimLockManager.SUB_MODULES = [
    'SimLockSystemDialog'
  ];

  BaseModule.create(SimLockManager, {
    name: 'SimLockManager',

    _previousSkiped: false,
    _simDialog: null,
    _ready: false,
    _currentIndex: -1,
    _attentionOpened: false,

    handleEvent: function(evt) {
      switch (evt.type) {
        case 'ftuopen':
          this._isFtuUpgrading ? this._simDialog.close() : this.showIfLocked();
          break;

        case 'attentionopening':
          this._attentionOpened = true;
          /* falls through */
        case 'lockscreen-appopened':
        case 'airplanemode-enabled':
          this._simDialog.close();
          break;

        case 'appopened':
          this._onAppOpened(evt);
          break;
        case 'simslotready':
          this._onSlotsReady();
          break;

        case 'simlockback':
          var current = this._currentIndex;
          this._simDialog.close();
          this._previousSkiped = false;
          this.showIfLocked(current - 1);
          break;

        case 'simlockskip':
          this._previousSkiped = true;
          /* falls through */
        case 'simlockrequestclose':
          var current = this._currentIndex;
          this._simDialog.close();
          this.showIfLocked(current + 1);
          break;

        case 'attentionterminated':
          this._attentionOpened = false;
          /* falls through */
        case 'lockscreen-appopened':
        case 'simslot-cardstatechange':
        case 'simslot-iccinfochange':
        case 'simslot-updated':
        case 'lockscreen-appclosed':
          this.showIfLocked(evt.detail.index || 0);
          break;
      }
    },

    showIfLocked: function(index) {
      var currentIndex = index || 0;
      if (!this._ready || this._allDialogsShown(currentIndex)) {
        this._previousSkiped = false;
        return;
      }

      if (this._isFtuRunning() && !this._isFtuUpgrading()) {
        return;
      }

      var slot = SIMSlotManager.get(currentIndex);

      if (!slot || !slot.simCard) {
        this.showIfLocked(currentIndex + 1);
        return;
      }

      this._handleStateChange(slot);
    },

    _handleStateChange: function(slot) {
      var state = slot.getCardState();
      switch (state) {
        case 'pukRequired':
        case 'pinRequired':
        case 'networkLocked':
        case 'corporateLocked':
        case 'serviceProviderLocked':
        case 'network1Locked':
        case 'network2Locked':
        case 'hrpdNetworkLocked':
        case 'ruimCorporateLocked':
        case 'ruimServiceProviderLocked':
          this._showDialog(slot);
          break;
        default:
          this.showIfLocked(slot.index + 1);
          break;
      }
      this._previousSkiped = false;
    },

    _showDialog: function(slot) {
      if (Service.locked || this._attentionOpened) {
        return;
      }

      if (!this._simDialog._visible) {
        this._simDialog.show(slot, this._previousSkiped);
        this._currentIndex = slot.index;
      }
    },

    _allDialogsShown: function(index) {
      return (index >= this._slotsLength);
    },

    _isFtuRunning: function() {
      return this.service.query('isFtuRunning');
    },

    _isFtuUpgrading: function() {
      return this.service.query('isFtuUpgrading');
    },

    _onSlotsReady: function() {
      this._ready = true;
      this._simDialog = new SimLockSystemDialog();
      this._slotsLength = SIMSlotManager.getSlots().length;
      this.showIfLocked();
    },

    _onAppOpened: function(evt) {
      // If an app needs 'telephony' or 'sms' permissions (i.e. mobile
      // connection) and the SIM card is locked, the SIM PIN unlock screen
      // should be launched

      var app = evt.detail;

      if (!app || !app.manifest || !app.manifest.permissions) {
        return;
      }

      if (!('telephony' in app.manifest.permissions ||
            'sms' in app.manifest.permissions)) {
        return;
      }

      // If the Settings app will open, don't prompt for SIM PIN entry
      // although it has 'telephony' permission (Bug 861206)
      var settingsManifestURL =
        'app://settings.gaiamobile.org/manifest.webapp';
      if (app.manifestURL == settingsManifestURL) {
        if (this._simDialog && this._simDialog.visible) {
          this._simDialog.close();
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
    }
  });
}());
