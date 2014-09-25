/* jshint loopfunc: true */
/* global SettingsHelper, SettingsListener, applications,
          UtilityTray, MozActivity, System */

/* global System */
'use strict';

(function(exports) {
  var QuickSettings = function() {};
  QuickSettings.SETTINGS = [
    'airplaneMode.status',
    'geolocation.enabled',
    'bluetooth.enabled',
    'wifi.enabled'
  ];
  QuickSettings.EVENTS = [
    'wifi-enabled',
    'wifi-disabled',
    'wifi-statuschange',
    'bluetooth-adapter-added',
    'bluetooth-disabled'
  ];
  System.create(QuickSettings, {}, {
    name: 'QuickSettings',
    // Indicate setting status of geolocation.enabled
    geolocationEnabled: false,
    WIFI_STATUSCHANGE_TIMEOUT: 2000,
    // ID of elements to create references
    ELEMENTS: ['wifi', 'data', 'bluetooth', 'airplane-mode', 'full-app'],
    WARNING_DIALOG_ENABLED_KEY:
      'ril.data.roaming_enabled.warningDialog.enabled',
    DATA_KEY: 'ril.data.enabled',
    DATA_ROAMING_KEY: 'ril.data.roaming_enabled',

    _start: function qs_init() {
      this.getAllElements();
      this.monitorDataChange();

      (function initNetworkSprite() {
        var networkTypeSetting =
          SettingsHelper('operatorResources.data.icon', {});

        networkTypeSetting.get(function gotNS(networkTypeValues) {
          if (!networkTypeValues) {
            return;
          }
          var sprite = networkTypeValues.data_sprite;
          if (sprite) {
            document.getElementById('quick-settings-data')
              .style.backgroundImage =
              'url("' + sprite + '")';
          }
        });
      })();

      this.overlay.addEventListener('click', this);
    },

    monitorDataChange: function() {
      var conns = System.getAPI('mobileConnection');

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
          'hsdpa': 'H', 'hsupa': 'H', 'hspa': 'H', // 3.5G HSDPA
          // 3G CDMA
          'evdo0': '3G', 'evdoa': '3G', 'evdob': '3G', '1xrtt': '3G',
          'umts': '3G', // 3G
          'edge': 'E', // EDGE
          'is95a': '2G', 'is95b': '2G', // 2G CDMA
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

    '_observe_bluetooth.enabled': function(value) {
      /* monitor bluetooth setting and initialization/disable ready event
       * - when settings changed, update UI and lock toogle to prevent quickly
       *   tapping on it.
       * - when got bluetooth initialization/disable ready, active toogle, so
       *   return the control to user.
       */
      var btFirstSet = true;
      // check self.bluetooth.dataset.enabled and value are identical
      if ((this.bluetooth.dataset.enabled && value) ||
          (this.bluetooth.dataset.enabled === undefined && !value)) {
        return;
      }

      if (value) {
        this.bluetooth.dataset.enabled = 'true';
      } else {
        delete this.bluetooth.dataset.enabled;
      }

      // Set to the initializing state to block user interaction until the
      // operation completes. (unless we are being called for the first time,
      // where Bluetooth is already initialize
      if (!btFirstSet) {
        this.bluetooth.dataset.initializing = 'true';
      }
      btFirstSet = false;

      this.setAccessibilityAttributes(this.bluetooth, 'bluetoothButton');
    },

    '_observe_wifi.enabled': function(value) {
      /* monitor wifi setting and initialization/disable ready event
       * - when settings changed, update UI and lock toogle to prevent quickly
       *   tapping on it.
       * - when got bluetooth initialization/disable ready, active toogle, so
       *   return the control to user.
       */
      var wifiFirstSet = true;
      // check self.wifi.dataset.enabled and value are identical
      if ((this.wifi.dataset.enabled && value) ||
          (this.wifi.dataset.enabled === undefined && !value)) {
        return;
      }

      if (value) {
        this.wifi.dataset.enabled = 'true';
      } else {
        delete this.wifi.dataset.enabled;
      }
      // Set to the initializing state to block user interaction until the
      // operation completes. (unless we are being called for the first time,
      // where Wifi is already initialize
      if (!wifiFirstSet) {
        this.wifi.dataset.initializing = 'true';
      }
      wifiFirstSet = false;

      this.setAccessibilityAttributes(this.wifi, 'wifiButton');
    },

    '_observe_geolocation.enabled': function(value) {
      /* monitor geolocation setting
       * TODO prevent quickly tapping on it
       */
      this.geolocationEnabled = value;
    },

    '_observe_airplaneMode.status': function(value) {
      delete this.airplaneMode.dataset.enabling;
      delete this.airplaneMode.dataset.disabling;

      this.data.dataset.airplaneMode = (value === 'enabled');
      switch (value) {
        case 'enabled':
          this.data.classList.add('quick-settings-airplane-mode');
          this.airplaneMode.dataset.enabled = 'true';
          break;
        case 'disabled':
          this.data.classList.remove('quick-settings-airplane-mode');
          delete this.airplaneMode.dataset.enabled;
          break;
        case 'enabling':
          this.airplaneMode.dataset.enabling = 'true';
          break;
        case 'disabling':
          this.airplaneMode.dataset.disabling = 'true';
          break;
      }
      this.setAccessibilityAttributes(this.airplaneMode, 'airplaneMode');
    },

    _handle_click: function qs_handleEvent(evt) {
      evt.preventDefault();
      var enabled = false;
      switch (evt.target) {
        case this.wifi:
          // do nothing if wifi isn't ready
          if (this.wifi.dataset.initializing) {
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
            // TODO should ignore the action if data initialization isn't done
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
          // do nothing if bluetooth isn't ready
          if (this.bluetooth.dataset.initializing) {
            return;
          }

          enabled = !!this.bluetooth.dataset.enabled;
          SettingsListener.getSettingsLock().set({
            'bluetooth.enabled': !enabled
          });
          break;

        case this.airplaneMode:
          var enable = this.airplaneMode.dataset.enabled ? 'disable' : 'enable';
          this.publish('request-airplane-mode-' + enable);
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
    },

    '_handle_bluetooth-adapter-added': function(evt) {
      delete this.bluetooth.dataset.initializing;
      this.setAccessibilityAttributes(this.bluetooth, 'bluetoothButton');
    },

    '_handle_bluetooth-disabled': function(evt) {
      delete this.bluetooth.dataset.initializing;
      this.setAccessibilityAttributes(this.bluetooth, 'bluetoothButton');
    },

    '_handle_wifi-enabled': function(evt) {
      delete this.wifi.dataset.initializing;
      this.wifi.dataset.enabled = 'true';
      this.setAccessibilityAttributes(this.wifi, 'wifiButton');
      if (this.toggleAutoConfigWifi) {
        // Check whether it found a wifi to connect after a timeout.
        this.wifiStatusTimer = setTimeout(this.autoConfigWifi.bind(this),
          this.WIFI_STATUSCHANGE_TIMEOUT);
      }
    },

    '_handle_wifi-disabled': function(evt) {
      delete this.wifi.dataset.initializing;
      delete this.wifi.dataset.enabled;
      this.setAccessibilityAttributes(this.wifi, 'wifiButton');
      if (this.toggleAutoConfigWifi) {
        clearTimeout(this.wifiStatusTimer);
        this.wifiStatusTimer = null;
        this.toggleAutoConfigWifi = false;
      }
    },

    '_handle_wifi-statuschange': function(evt) {
      if (this.toggleAutoConfigWifi && !this.wifi.dataset.initializing) {
        this.autoConfigWifi();
      }
    },

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

    // XXX Break down obj keys in a for each loop because mozSettings
    // does not currently supports multiple keys in one set()
    // https://bugzilla.mozilla.org/show_bug.cgi?id=779381
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
     */
    setAccessibilityAttributes: function(button, label, type) {
      label += button.dataset.enabled === undefined ? '-off' : '-on';
      if (button.dataset.initializing !== undefined) {
        label += '-initializing';
      }

      button.setAttribute('aria-label', navigator.mozL10n.get(label, {
        type: type || ''
      }));
      button.setAttribute('aria-pressed', button.dataset.enabled !== undefined);
    },

    /* Auto-config wifi if user enabled wifi from quick settings bar.
     * If there are no known networks around, wifi settings page
     * will be opened. Otherwise nothing will be done.
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
  });

  exports.QuickSettings = QuickSettings;
}(window));
