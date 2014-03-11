'use strict';

window.MockDsdsSettings = (function() {
  var _iccCardIndexForCallSettings = 2;

  function ds_getIccCardIndexForCallSettings() {
    return _iccCardIndexForCallSettings;
  }

  function ds_setIccCardIndexForCallSettings(iccCardIndexForCallSettings) {
    _iccCardIndexForCallSettings = iccCardIndexForCallSettings;
  }

  return {
    getIccCardIndexForCallSettings: ds_getIccCardIndexForCallSettings,
    setIccCardIndexForCallSettings: ds_setIccCardIndexForCallSettings
  };
})();
