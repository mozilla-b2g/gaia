'use strict';

var MockVariantManager = {
  init: function vm_init() { },
  getVariantSettings: function sg(onsuccess, onerror) { },
  readJSONFile: function settings_readJSONFile(file, onsuccess, onerror) { },
  CUSTOMIZERS: [],
  iccHandler: function vm_iccHandler() { },
  // Loads the variant file and start customization event dispatching.
  loadVariantAndCustomize: function() { },

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
      window.dispatchEvent(event);
    }

  },

  getMccMnc: function getMccMnc() { },
  normalizeCode: function normalizeCode(aCode) { }
};
