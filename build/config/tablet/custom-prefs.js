/*global user_pref*/
user_pref('devtools.responsiveUI.customWidth', 1280);
user_pref('devtools.responsiveUI.customHeight', 800);
user_pref('devtools.responsiveUI.currentPreset', 'custom');
user_pref('devtools.useragent.device_type', 'Tablet');

// Disable Firefox Accounts device registration because it depends on Sync.
user_pref('identity.fxaccounts.skipDeviceRegistration', true);
