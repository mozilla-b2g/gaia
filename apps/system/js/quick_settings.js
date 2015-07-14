/* jshint loopfunc: true */
/* global Service, SettingsListener, applications,
          UtilityTray, MozActivity */

'use strict';

(function(exports) {

  function QuickSettings() {}

  QuickSettings.prototype = {
    /**
     * Indicate setting status of geolocation.enabled
     * @memberof QuickSettings.prototype
     * @type {Boolean}
     */
    geolocationEnabled: false,

    /**
     * Timeout to wait for a wifi auto-connect.
     * @memberof QuickSettings.prototype
     * @type {Integer}
     */
    WIFI_STATUSCHANGE_TIMEOUT: 2000,

    /**
     * Indicate setting status of airplane mode
     * @memberof QuickSettings.prototype
     * @type {Boolean}
     */
    airplaneModeSwitching: false,

    /**
     * ID of elements to create references
     * @memberof QuickSettings.prototype
     * @type {Array}
     */
    ELEMENTS: ['wifi', 'data', 'bluetooth', 'airplane-mode', 'full-app'],

    /**
     * Setting key for the roaming dialog.
     * @memberof QuickSettings.prototype
     * @type {String}
     */
    WARNING_DIALOG_ENABLED_KEY:
      'ril.data.roaming_enabled.warningDialog.enabled',

    /**
     * Setting key for data enabled.
     * @memberof QuickSettings.prototype
     * @type {String}
     */
    DATA_KEY: 'ril.data.enabled',

    /**
     * Setting key for data roaming enabled.
     * @memberof QuickSettings.prototype
     * @type {String}
     */
    DATA_ROAMING_KEY: 'ril.data.roaming_enabled',

    /**
     * Starts listening for events.
     * @memberof QuickSettings.prototype
     */
    start: function qs_init() {
      var settings = window.navigator.mozSettings;
      if (!settings) {
        return;
      }

      this.getAllElements();
      this.monitorDataChange();

      window.addEventListener('dataiconchanged', this);
      this._handle_dataiconchanged();

      this.overlay.addEventListener('click', this);
      window.addEventListener('utilitytrayshow', this);

      this.monitorBluetoothChange();
      this.monitorWifiChange();
      this.monitorGeoChange();
      this.monitorAirplaneModeChange();
    },

    _handle_dataiconchanged: function() {
      var networkTypeValues = Service.query('dataIcon');
      if (!networkTypeValues) {
        return;
      }
      var sprite = networkTypeValues.data_sprite;
      if (sprite) {
        document.getElementById('quick-settings-data')
                .style.backgroundImage = 'url("' + sprite + '")';
      }
    },

    /**
     * Monitors current connectivity and updates the icon.
     * @memberof QuickSettings.prototype
     */
    monitorDataChange: function() {
      var conns = window.navigator.mozMobileConnections;

      if (!conns) {
        // hide data icon without mozMobileConnection object
        this.overlay.classList.add('non-mobile');
      } else {
        var LABEL_TO_ICON = {
          '4G': '4g',
          'H+': 'hspa-plus',
          'H': 'hspa',
          '3G': '3g',
          'E': 'edge',
          '2G': '2g',
          'undefined': 'data'
        };
        var label = {
          'lte': '4G', // 4G LTE
          'ehrpd': '4G', // 4G CDMA
          'hspa+': 'H+', // 3.5G HSPA+
          'hsdpa': 'H',
          'hsupa': 'H',
          'hspa': 'H', // 3.5G HSDPA
          // 3G CDMA
          'evdo0': '3G',
          'evdoa': '3G',
          'evdob': '3G',
          '1xrtt': '3G',
          'umts': '3G', // 3G
          'edge': 'E', // EDGE
          'is95a': '2G',
          'is95b': '2G', // 2G CDMA
          'gprs': '2G'
        };

        for (var i = 0; i < conns.length; i++) {
          var conn = conns[i];
          conn.addEventListener('datachange', function qs_onDataChange() {
            var dataType;
            // if there is any data connection got established,
            // we would just use that
            for (var j = 0; j < conns.length; j++) {
              dataType = label[conns[j].data.type] || dataType;
            }
            this.data.dataset.network = dataType;
            this.data.dataset.icon = LABEL_TO_ICON[String(dataType)];
            this.setAccessibilityAttributes(this.data, 'dataButton', dataType);
          }.bind(this));
        }

        /*
         * monitor data setting
         * TODO prevent quickly tapping on it
         * @memberof QuickSettings.prototype
         */
        SettingsListener.observe('ril.data.enabled', true, function(value) {
          if (value) {
            this.data.dataset.enabled = 'true';
          } else {
            delete this.data.dataset.enabled;
          }
          this.setAccessibilityAttributes(this.data, 'dataButton',
            this.data.dataset.network);
        }.bind(this));
      }
    },

    /**
     * Monitor bluetooth setting and initialization/disable ready event
     * - when settings changed, update UI and lock toogle to prevent quickly
     *   tapping on it.
     * - when got bluetooth initialization/disable ready, active toogle, so
     *   return the control to user.
     * @memberof QuickSettings.prototype
     */
    monitorBluetoothChange: function() {
      // Bluetooth module is loaded after quicksettings.
      window.addEventListener('bluetooth-enabled', this);
      window.addEventListener('bluetooth-disabled', this);
    },

    /**
     * Monitor wifi setting and initialization/disable ready event
     * - when settings changed, update UI and lock toogle to prevent quickly
     *   tapping on it.
     * - when got bluetooth initialization/disable ready, active toogle, so
     *   return the control to user.
     * @memberof QuickSettings.prototype
     */
    monitorWifiChange: function() {
      var self = this;
      var wifiFirstSet = true;
      SettingsListener.observe('wifi.enabled', true, function(value) {
        // check self.wifi.dataset.enabled and value are identical
        if ((self.wifi.dataset.enabled === 'true' && value) ||
            (self.wifi.dataset.enabled === undefined && !value)) {
          return;
        }

        if (value) {
          self.wifi.dataset.enabled = 'true';
        } else {
          delete self.wifi.dataset.enabled;
        }
        // Set to the initializing state to block user interaction until the
        // operation completes. (unless we are being called for the first time,
        // where Wifi is already initialize
        if (!wifiFirstSet) {
          self.wifi.dataset.initializing = 'true';
        }
        wifiFirstSet = false;

        self.setAccessibilityAttributes(self.wifi, 'wifiButton');
      });
      window.addEventListener('wifi-enabled', this);
      window.addEventListener('wifi-disabled', this);
      window.addEventListener('wifi-statuschange', this);
    },

    /**
     * Monitor geolocation setting
     * TODO prevent quickly tapping on it
     * @memberof QuickSettings.prototype
     */
    monitorGeoChange: function() {
      var self = this;
      SettingsListener.observe('geolocation.enabled', true, function(value) {
        self.geolocationEnabled = value;
      });
    },

    /**
     * Monitor airplane mode setting
     * @memberof QuickSettings.prototype
     */
    monitorAirplaneModeChange: function() {
      var self = this;
      SettingsListener.observe('airplaneMode.status', false, function(value) {
        delete self.airplaneMode.dataset.enabling;
        delete self.airplaneMode.dataset.disabling;
        // reset airplaneModeSwitching
        self.airplaneModeSwitching = false;

        self.data.dataset.airplaneMode = (value === 'enabled');
        switch (value) {
          case 'enabled':
            self.data.classList.add('quick-settings-airplane-mode');
            self.airplaneMode.dataset.enabled = 'true';
            break;
          case 'disabled':
            self.data.classList.remove('quick-settings-airplane-mode');
            delete self.airplaneMode.dataset.enabled;
            break;
          case 'enabling':
            self.airplaneMode.dataset.enabling = 'true';
            self.airplaneModeSwitching = true;
            break;
          case 'disabling':
            self.airplaneMode.dataset.disabling = 'true';
            self.airplaneModeSwitching = true;
            break;
        }
        self.setAccessibilityAttributes(self.airplaneMode, 'airplaneMode');
      });
    },

    /**
     * General event handler.
     * @memberof QuickSettings.prototype
     */
    handleEvent: function qs_handleEvent(evt) {
      evt.preventDefault();
      var enabled = false;
      switch (evt.type) {
        case 'dataiconchanged':
          this._handle_dataiconchanged();
          break;
        case 'click':
          switch (evt.target) {
            case this.wifi:
              // do nothing if wifi isn't ready or
              // airplaneMode is switching to another mode.
              if (this.wifi.dataset.initializing ||
                this.airplaneModeSwitching) {
                return;
              }
              enabled = !!this.wifi.dataset.enabled;
              SettingsListener.getSettingsLock().set({
                'wifi.enabled': !enabled
              });
              SettingsListener.getSettingsLock().set({
                'wifi.connect_via_settings': !enabled
              });
              if (!enabled) {
                this.toggleAutoConfigWifi = true;
              }
              break;

            case this.data:
              if (this.data.dataset.airplaneMode !== 'true') {
                // TODO should ignore the action if initialization isn't done
                enabled = !!this.data.dataset.enabled;
                if (enabled) {
                  var cset = {};
                  cset[this.DATA_KEY] = !enabled;
                  this.setMozSettings(cset);
                } else {
                  //Data is not active we want to enable it
                  this.showDataRoamingEnabledPromptIfNeeded();
                }
              }
              break;

            case this.bluetooth:
              // do nothing if bluetooth isn't ready or
              // airplaneMode is switching to another mode.
              if (this.bluetooth.dataset.initializing ||
                this.airplaneModeSwitching) {
                return;
              }

              enabled = !!this.bluetooth.dataset.enabled;
              if (enabled) {
                window.dispatchEvent(
                  new CustomEvent('request-disable-bluetooth'));
              } else {
                window.dispatchEvent(
                  new CustomEvent('request-enable-bluetooth'));
              }
              this.bluetooth.dataset.initializing = 'true';
              break;

            case this.airplaneMode:
              if (this.airplaneModeSwitching) {
                return;
              }
              var toggle = this.airplaneMode.dataset.enabled ?
                'request-airplane-mode-disable' :
                'request-airplane-mode-enable';
              window.dispatchEvent(new CustomEvent(toggle));
              break;

            case this.fullApp:
              // XXX: This should be replaced probably by Web Activities
              var host = document.location.host;
              var domain = host.replace(/(^[\w\d]+\.)?([\w\d]+\.[a-z]+)/, '$2');
              var protocol = document.location.protocol + '//';
              applications.getByManifestURL(protocol + 'settings.' +
                domain + '/manifest.webapp').launch();

              UtilityTray.hide();
              break;
          }
          break;

        case 'utilitytrayshow':
          break;

          // unlock bluetooth toggle
        case 'bluetooth-enabled':
          this.bluetooth.dataset.enabled = 'true';
          delete this.bluetooth.dataset.initializing;
          this.setAccessibilityAttributes(this.bluetooth, 'bluetoothButton');
          break;
        case 'bluetooth-disabled':
          delete this.bluetooth.dataset.enabled;
          delete this.bluetooth.dataset.initializing;
          this.setAccessibilityAttributes(this.bluetooth, 'bluetoothButton');
          break;
          // unlock wifi toggle
        case 'wifi-enabled':
          delete this.wifi.dataset.initializing;
          this.wifi.dataset.enabled = 'true';
          this.setAccessibilityAttributes(this.wifi, 'wifiButton');
          if (this.toggleAutoConfigWifi) {
            // Check whether it found a wifi to connect after a timeout.
            this.wifiStatusTimer = setTimeout(this.autoConfigWifi.bind(this),
              this.WIFI_STATUSCHANGE_TIMEOUT);
          }
          break;
        case 'wifi-disabled':
          delete this.wifi.dataset.initializing;
          delete this.wifi.dataset.enabled;
          this.setAccessibilityAttributes(this.wifi, 'wifiButton');
          if (this.toggleAutoConfigWifi) {
            clearTimeout(this.wifiStatusTimer);
            this.wifiStatusTimer = null;
            this.toggleAutoConfigWifi = false;
          }
          break;

        case 'wifi-statuschange':
          if (this.toggleAutoConfigWifi && !this.wifi.dataset.initializing) {
            this.autoConfigWifi();
          }
          break;
      }
    },

    /**
     * Gets all relevant elements with an id prefixed by quick-settings-.
     * @memberof QuickSettings.prototype
     */
    getAllElements: function qs_getAllElements() {
      var toCamelCase = function toCamelCase(str) {
        return str.replace(/\-(.)/g, function replacer(str, p1) {
          return p1.toUpperCase();
        });
      };

      this.ELEMENTS.forEach(function createElementRef(name) {
        this[toCamelCase(name)] =
          document.getElementById('quick-settings-' + name);
      }, this);

      this.overlay = document.getElementById('quick-settings');
    },

    /**
     * XXX Break down obj keys in a for each loop because mozSettings
     * does not currently supports multiple keys in one set()
     * https://bugzilla.mozilla.org/show_bug.cgi?id=779381
     * @memberof QuickSettings.prototype
     */
    setMozSettings: function qs_setter(keypairs) {
      var setlock = SettingsListener.getSettingsLock();
      for (var key in keypairs) {
        var obj = {};
        obj[key] = keypairs[key];
        setlock.set(obj);
      }
    },

    /**
     * Set aria-label and aria-pressed attributes for the appropriate buttons.
     * @param {Object} button Element.
     * @param {String} label Button label.
     * @param {?String} type Optional type attribute for l10n.
     * @memberof QuickSettings.prototype
     */
    setAccessibilityAttributes: function(button, label, type) {
      label = 'quick-settings-' + label +
        (button.dataset.enabled === undefined ? '-off' : '-on');
      if (button.dataset.initializing !== undefined) {
        label += '-initializing';
      }
      navigator.mozL10n.setAttributes(button, label, { type: type || '' });
      button.setAttribute('aria-pressed', button.dataset.enabled !== undefined);
    },

    /**
     * Auto-config wifi if user enabled wifi from quick settings bar.
     * If there are no known networks around, wifi settings page
     * will be opened. Otherwise nothing will be done.
     * @memberof QuickSettings.prototype
     */
    autoConfigWifi: function qs_autoConfigWifi() {
      clearTimeout(this.wifiStatusTimer);
      this.wifiStatusTimer = null;
      this.toggleAutoConfigWifi = false;

      var wifiManager = window.navigator.mozWifiManager;
      var status = wifiManager.connection.status;

      if (status == 'disconnected') {
        SettingsListener.getSettingsLock().set({
          'wifi.connect_via_settings': false
        });
        var activity = new MozActivity({
          name: 'configure',
          data: {
            target: 'device',
            section: 'wifi'
          }
        });
        return activity;
      } else if (status == 'connectingfailed') {
        SettingsListener.getSettingsLock().set({
          'wifi.connect_via_settings': false
        });
      }
    },

    /**
     * Checks if we are currently roaming or not.
     * @memberof QuickSettings.prototype
     */
    checkDataRoaming: function qs_checkDataRoaming() {
      var lock = SettingsListener.getSettingsLock();
      var reqSetting = lock.get(this.DATA_ROAMING_KEY);
      var self = this;
      return new Promise(function(resolve, reject) {
        reqSetting.onerror = function() {
          resolve(true);
        };
        reqSetting.onsuccess = function() {
          resolve(reqSetting.result[self.DATA_ROAMING_KEY]);
        };
      });
    },

    /**
     * Prompts the user if they are requesting to enable data roaming.
     * @memberof QuickSettings.prototype
     */
    showDataRoamingEnabledPromptIfNeeded:
      function qs_showDataRoamingEnabledPromptIfNeeded() {
      var dialog = document.querySelector('#quick-setting-data-enabled-dialog'),
        enableBtn = document.querySelector('.quick-setting-data-ok-btn'),
        cancelBtn = document.querySelector('.quick-setting-data-cancel-btn');
      var self = this;
      var connections = window.navigator.mozMobileConnections;
      var dataType;
      var sim;

      if (!connections) {
        return;
      }
      // In DualSim only one of them will have data active
      for (var i = 0; i < connections.length && !dataType; i++) {
        dataType = connections[i].data.type;
        sim = connections[i];
      }
      if (!dataType) {
        //No connection available
        return;
      }

      this.checkDataRoaming().then(function(roaming) {
        if (!roaming && sim.data.roaming) {
          disabledDefaultDialogIfNeeded();
        } else {
          var cset = {};
          cset[self.DATA_KEY] = true;
          self.setMozSettings(cset);
          return;
        }
      });

      // Hides the warning dialog to prevent to show it in settings app again
      var disabledDefaultDialogIfNeeded = function() {
        self.getDataRoamingWarning().then(function(warningEnabled) {
          if (warningEnabled === null || warningEnabled) {
            var cset = {};
            cset[self.WARNING_DIALOG_ENABLED_KEY] = false;
            self.setMozSettings(cset);
          }
          enableDialog(true);
        });
      };

      var enableSetting = function() {
        var cset = {};
        cset[self.DATA_KEY] = true;
        cset[self.DATA_ROAMING_KEY] = true;
        self.setMozSettings(cset);
        enableDialog(false);
      };

      var cancel = function() {
        enableDialog(false);
      };

      function enableDialog(enabled) {
        if (enabled) {
          UtilityTray.hide();
          enableBtn.addEventListener('click', enableSetting);
          cancelBtn.addEventListener('click', cancel);
          dialog.classList.add('visible');
        } else {
          enableBtn.removeEventListener('click', enableSetting);
          cancelBtn.removeEventListener('click', cancel);
          dialog.classList.remove('visible');
        }
      }
    },

    /**
     * Checks whether or not we should prompt the user when enabling
     * data roaming.
     * @memberof QuickSettings.prototype
     */
    getDataRoamingWarning: function qs_getDataRoamingWarning() {
      var lock = SettingsListener.getSettingsLock();
      var reqSetting = lock.get(this.WARNING_DIALOG_ENABLED_KEY);
      var self = this;

      return new Promise(function(resolve, reject) {
        reqSetting.onerror = function() {
          resolve(true);
        };

        reqSetting.onsuccess = function() {
          resolve(reqSetting.result[self.WARNING_DIALOG_ENABLED_KEY]);
        };
      });
    }
  };

  exports.QuickSettings = QuickSettings;

}(window));
