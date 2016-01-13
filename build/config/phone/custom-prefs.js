/*global user_pref*/
user_pref('devtools.responsiveUI.customWidth', 320);
user_pref('devtools.responsiveUI.customHeight', 480);
user_pref('devtools.responsiveUI.currentPreset', 'custom');

// Disable Firefox Accounts device registration because it depends on Sync.
user_pref('identity.fxaccounts.skipDeviceRegistration', true);
