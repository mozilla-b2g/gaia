'use strict';

var MockVariantManager = {
  //  For each variant setting dispatch a customization event
  dispatchCustomizationEvents: function(variantCustomization) {
    for (var setting in variantCustomization) {
      if (variantCustomization.hasOwnProperty(setting)) {

        var customizationEvent = new CustomEvent('customization', {
          detail: {
            setting: setting,
            value: variantCustomization[setting]
          }
        });

        window.dispatchEvent(customizationEvent);
      }
    }
  }
};
