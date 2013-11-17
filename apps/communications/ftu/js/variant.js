'use strict';

var VariantManager = {
  // This file is created during the BUILD process
  CUSTOMIZATION_FILE: '/resources/customization.json',
  init: function vm_init() {
    if (!IccHelper) {
      console.error('Impossible to access iccInfo via IccHelper. Aborting.');
      return;
    }

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
    var self = this;
    var filePath = this.CUSTOMIZATION_FILE;
    Resources.load(filePath, 'json', function(data) {
      onsuccess && onsuccess(data);
    }, onerror);
  },

  CUSTOMIZERS: [
    // Base class, dont remove!
    '/ftu/js/customizers/customizer.js',
    // Extended classes from 'Customizer'
    '/ftu/js/customizers/wallpaper_customizer.js',
    '/ftu/js/customizers/ringtone_customizer.js',
    '/ftu/js/customizers/support_contacts_customizer.js',
    '/ftu/js/customizers/default_contacts_customizer.js'
  ],

  iccHandler: function vm_iccHandler() {
    this.mcc_mnc = this.getMccMnc();
    if (this.mcc_mnc) {
      IccHelper.removeEventListener('iccinfochange', this.boundIccHandler);
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
    var mcc = IccHelper.iccInfo ? IccHelper.iccInfo.mcc : undefined;
    var mnc = IccHelper.iccInfo ? IccHelper.iccInfo.mnc : undefined;
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
