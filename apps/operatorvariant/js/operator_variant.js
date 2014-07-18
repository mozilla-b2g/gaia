/* global LazyLoader, Resources */

'use strict';

var OperatorVariantManager = {
  SETTING_FTU_SIM_PRESENT: 'ftu.simPresentOnFirstBoot',

  // Settings 'ftu.simPresentOnFirstBoot' only had false value if the user
  // powered the phone on without SIM
  // In other case we would have true or undefined depending on what process was
  // executed first, so our variable is true by default.
  simPresentOnFirstBoot: true,

  // This file is created during the BUILD process
  CUSTOMIZATION_FILE: '/resources/customization.json',

  // If you want to add another customizer, you only need to add the js file
  // with the implementation here
  CUSTOMIZERS: [
    // Base class, dont remove!
    '/js/customizers/customizer.js',
    // Extended classes from 'Customizer'
    '/js/customizers/keyboard_settings_customizer.js',
    '/js/customizers/wallpaper_customizer.js',
    '/js/customizers/network_type_customizer.js',
    '/js/customizers/ringtone_customizer.js',
    '/js/customizers/support_contacts_customizer.js',
    '/js/customizers/sms_customizer.js',
    '/js/customizers/default_contacts_customizer.js',
    '/js/customizers/power_customizer.js',
    '/js/customizers/known_networks_customizer.js',
    '/js/customizers/data_ftu_customizer.js',
    '/js/customizers/nfc_customizer.js',
    '/js/customizers/search_customizer.js',
    '/js/customizers/default_search_customizer.js',
    '/js/customizers/topsites_customizer.js'
  ],

  init: function ovm_init() {
    navigator.mozSetMessageHandler('first-run-with-sim', (msg) => {
      var self = this;
      self.mcc_mnc = self.getMccMnc(msg.mcc, msg.mnc);
      if (self.mcc_mnc) {
        var settings = navigator.mozSettings;
        if (!settings) {
          console.log(
            'Settings is not available. Cannot make the configuration changes');
          return;
        }
        var req = settings.createLock().get(self.SETTING_FTU_SIM_PRESENT);

        req.onsuccess = function osv_success(e) {
          var simOnFirstBoot = req.result[self.SETTING_FTU_SIM_PRESENT];
          self.simPresentOnFirstBoot = !simOnFirstBoot ||
              req.result[self.SETTING_FTU_SIM_PRESENT] === self.mcc_mnc;
          LazyLoader.load(
            self.CUSTOMIZERS,
            self.loadVariantAndCustomize.bind(self)
          );
        };

        req.onerror = function osv_error(e) {
          console.error('Error retrieving ftu.simPresentOnFirstBoot. ', e);
        };
      }
    });
  },

  getMccMnc: function ovm_getMccMnc(aMcc, aMnc) {
    if ((aMcc !== undefined) && (aMcc !== null) &&
        (aMnc !== undefined) && (aMnc !== null)) {
      return this.normalizeCode(aMcc) + '-' + this.normalizeCode(aMnc);
    }
    return undefined;
  },

  // Given a number returns a three characters string padding with zeroes
  // to the left until the desired length (3) is reached
  normalizeCode: function ovm_normalizeCode(aCode) {
    var ncode = '' + aCode;
    while (ncode.length < 3) {
      ncode = '0' + ncode;
    }
    return ncode;
  },

  // Loads the variant file and start customization event dispatching.
  loadVariantAndCustomize: function ovm_loadVariantAndCustomize() {
    this.getVariantSettings(this.dispatchCustomizationEvents.bind(this));
  },

  getVariantSettings: function ovm_getVariantSettings(onsuccess, onerror) {
    var filePath = this.CUSTOMIZATION_FILE;
    Resources.load(filePath, 'json', function(data) {
      onsuccess && onsuccess(data);
    }, onerror);
  },

  //  For each variant setting dispatch a customization event
  dispatchCustomizationEvents: function ovm_dispatchEvents(customizationList) {
    if (!customizationList) {
      console.log('No customizers were found. Please review the content of ' +
                  this.CUSTOMIZATION_FILE + '.');
      return;
    }

    function scheduleEvent(event) {
      setTimeout(function() {
        window.dispatchEvent(event);
      }, 0);
    }

    var customizationSettings = customizationList[this.mcc_mnc];
    if (!customizationSettings) {
      console.error('There is no variant customization available for ' +
        this.mcc_mnc);
      return;
    }
    for (var setting in customizationSettings) {
      if (customizationSettings.hasOwnProperty(setting)) {
        var customizationEvent = new CustomEvent('customization', {
          detail: {
            setting: setting,
            value: customizationSettings[setting],
            simPresentOnFirstBoot: this.simPresentOnFirstBoot
          }
        });
        scheduleEvent(customizationEvent);
      }
    }
  }
};

OperatorVariantManager.init();
