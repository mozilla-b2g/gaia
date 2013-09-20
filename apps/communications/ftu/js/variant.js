'use strict';

var VariantManager = {
  init: function vm_init() {

    if (!IccHelper.enabled) {
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

  getVariantSettings: function settings_getVariantSettings(onsuccess, onerror) {
    var self = this;
    var filePath = '/ftu/js/variants/' + self.mcc_mnc + '.json';
    this.readJSONFile(filePath, function(data) {
      self._variantCustomization = data;
      if (onsuccess) onsuccess(data);
    }, onerror);
  },

  readJSONFile: function settings_readJSONFile(file, onsuccess, onerror) {
    var URI = file;

    var xhr = new XMLHttpRequest();
    xhr.open('GET', URI, true); // async
    xhr.overrideMimeType('application/json');
    xhr.responseType = 'json';
    xhr.onload = function() {
      if (xhr.status === 200) {
        if (onsuccess) onsuccess(xhr.response);
      } else {
        console.error('Failed to fetch file: ' + file, xhr.statusText);
        if (onerror) onerror();
      }
    };
    xhr.send();
  },

  CUSTOMIZERS: ['/ftu/js/customizers/wallpaper_customizer.js'],

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

  // Loads the variant file and start customization event dispatchign.
  loadVariantAndCustomize: function() {
    this.getVariantSettings(this.dispatchCustomizationEvents.bind(this));
  },

  //  For each variant setting dispatch a customization event
  dispatchCustomizationEvents: function vm_dispatchEvents(variantCustomization)
  {
    for (var setting in variantCustomization) {
      if (variantCustomization.hasOwnProperty(setting)) {

        var customizationEvent = new CustomEvent('customization', {
          detail: {
            setting: setting,
            value: variantCustomization[setting]
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

  getMccMnc: function getMccMnc() {
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
  normalizeCode: function normalizeCode(aCode) {
    var ncode = '' + aCode;
    while (ncode.length < 3) {
      ncode = '0' + ncode;
    }
    return ncode;
  }
};
