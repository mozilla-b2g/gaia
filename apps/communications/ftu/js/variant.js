'use strict';

var VariantManager = {
  // This file is created during the BUILD process
  CUSTOMIZATION_FILE: '/resources/customization.json',
  init: function vm_init() {
    // Check if the iccInfo is available
    this.mcc_mnc = this.getMccMnc();
    if (this.mcc_mnc) {
      this.iccHandler();
    } else {
      this.boundIccHandler = this.iccHandler.bind(this);
      IccHelper.addEventListener('iccinfochange', this.boundIccHandler);
    }
  },

  getVariantSettings: function vm_getVariantSettings(onsuccess, onerror) {
    var filePath = this.CUSTOMIZATION_FILE;
    Resources.load(filePath, 'json', function(data) {
      onsuccess && onsuccess(data);
    }, onerror);
  },

  CUSTOMIZERS: [
    // Base class, dont remove!
    '/ftu/js/customizers/customizer.js',
    // Extended classes from 'Customizer'
    '/ftu/js/customizers/keyboard_settings_customizer.js',
    '/ftu/js/customizers/wallpaper_customizer.js',
    '/ftu/js/customizers/data_icon_statusbar_customizer.js',
    '/ftu/js/customizers/ringtone_customizer.js',
    '/ftu/js/customizers/support_contacts_customizer.js',
    '/ftu/js/customizers/default_contacts_customizer.js'
  ],

  iccHandler: function vm_iccHandler() {
    this.mcc_mnc = this.getMccMnc();
    if (this.mcc_mnc) {
      if (IccHelper) {
        IccHelper.removeEventListener('iccinfochange', this.boundIccHandler);
      }
      // Load the variant customizers and the variant JSON file.
      LazyLoader.load(
        this.CUSTOMIZERS,
        this.loadVariantAndCustomize.bind(this)
      );
    }
  },

  // Loads the variant file and start customization event dispatching.
  loadVariantAndCustomize: function vm_loadVariantAndCustomize() {
    this.getVariantSettings(this.dispatchCustomizationEvents.bind(this));
  },

  //  For each variant setting dispatch a customization event
  dispatchCustomizationEvents: function vm_dispatchEvents(customizationList)
  {
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

    function scheduleEvent(event) {
      setTimeout(function() {
        window.dispatchEvent(event);
      }, 0);
    }

  },

  getMccMnc: function vm_getMccMnc() {
    var mcc = undefined;
    var mnc = undefined;
    // If we have valid iccInfo, use that. Otherwise continue with undefined
    // values.
    if (IccHelper && IccHelper.iccInfo) {
      mcc = IccHelper.iccInfo.mcc;
      mnc = IccHelper.iccInfo.mnc;
    } else if (!IccHelper || IccHelper.cardState === null) {
      // if IccHelper isn't available or if it is available
      // but has null cardState (this means no SIM available) configure with
      // defaults
      mcc = '000';
      mnc = '000';
    }
    if ((mcc !== undefined) && (mcc !== null) &&
        (mnc !== undefined) && (mnc !== null)) {
      return this.normalizeCode(mcc) + '-' + this.normalizeCode(mnc);
    }
    return undefined;
  },

  // Given a number returns a three characters string padding with zeroes
  // to the left until the desired length (3) is reached
  normalizeCode: function vm_normalizeCode(aCode) {
    var ncode = '' + aCode;
    while (ncode.length < 3) {
      ncode = '0' + ncode;
    }
    return ncode;
  }
};
