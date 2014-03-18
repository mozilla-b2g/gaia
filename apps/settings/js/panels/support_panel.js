/**
* Used to show Device/Help panel
*/
define('panels/support_panel',
  ['modules/settings_panel', 'modules/support'],
  function(SettingsPanel, Support) {
    'use strict';
    return function ctor_Support() {
      return SettingsPanel({
        onInit: function(rootElement) {
          Support.init();
        }
      });
    };
});
