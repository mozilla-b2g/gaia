/*global user_pref*/
user_pref('devtools.responsiveUI.customWidth', 1366);
user_pref('devtools.responsiveUI.customHeight', 768);
user_pref('devtools.responsiveUI.currentPreset', 'custom');
user_pref('b2g.system_startup_url',
          'app://smart-system.gaiamobile.org/index.html');
user_pref('b2g.system_manifest_url',
          'app://smart-system.gaiamobile.org/manifest.webapp');
user_pref('b2g.neterror.url',
          'app://smart-system.gaiamobile.org/net_error.html');
user_pref('dom.meta-viewport.enabled', false);
user_pref('dom.presentation.enabled', true);
user_pref('devtools.useragent.device_type', 'TV');
user_pref('dom.apps.customization.enabled', false);

// Remote Control default setting, enable service and pairing
user_pref("remotecontrol.service.enabled", true);
user_pref("remotecontrol.service.pairing_required", true);
// Remote control URL. Gecko loads its required static file in this app.
user_pref("remotecontrol.client_page.prepath", "app://remote-control-client.gaiamobile.org");
user_pref("remotecontrol.client_page.blacklist", "/client.html,/pairing.html");
