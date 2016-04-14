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

// Collaborate with meta-viewport to fulfill more complete web experience
user_pref('apz.allow_zooming', true);
// Larger value to provide better experience for apps/pages which targets on
// TV but uses embed tag with hard-coded width/height
user_pref('browser.viewport.desktopWidth', 1280);

user_pref('dom.presentation.enabled', true);
user_pref('devtools.useragent.device_type', 'TV');
user_pref('dom.apps.customization.enabled', false);

// Remote Control default setting, enable service and pairing
user_pref('remotecontrol.service.enabled', true);
user_pref('remotecontrol.service.pairing_required', true);
// Remote control URL. Gecko loads its required static file in this app.
user_pref('remotecontrol.client_page.prepath',
          'app://remote-control-client.gaiamobile.org');
user_pref('remotecontrol.client_page.blacklist', '/client.html,/pairing.html');

//network offline error
user_pref('network.offline-mirrors-connectivity', true);
