/* global LazyLoader, Resources */

'use strict';

var OperatorVariantManager = {
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
    'js/customizers/default_contacts_customizer.js',
    '/js/customizers/power_customizer.js',
    '/js/customizers/known_networks_customizer.js',
    '/js/customizers/data_ftu_customizer.js'
  ],

  init: function ovm_init() {
    window.navigator.mozSetMessageHandler('first-run-with-sim', msg => {
      this.mcc_mnc = this.getMccMnc(msg.mcc, msg.mnc);
      if (this.mcc_mnc) {
        // Load the variant customizers and the variant JSON file.
        LazyLoader.load(
          this.CUSTOMIZERS,
          this.loadVariantAndCustomize.bind(this)
        );
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
            value: customizationSettings[setting]
          }
        });
        scheduleEvent(customizationEvent);
      }
    }
  }
};

OperatorVariantManager.init();
