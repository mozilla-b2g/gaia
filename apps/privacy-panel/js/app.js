'use strict';

require.config({
  baseUrl: '/js',
  paths: {
    'shared': '../shared/js'
  },
  shim: {
    'shared/lazy_loader': {
      exports: 'LazyLoader'
    },
    'shared/settings_listener': {
      exports: 'SettingsListener'
    },
    'shared/settings_helper': {
      exports: 'SettingsHelper'
    },
    'shared/settings_url': {
      exports: 'SettingsURL'
    },
    'shared/async_storage': {
      exports: 'asyncStorage'
    },
    'shared/manifest_helper': {
      exports: 'ManifestHelper'
    },
    'shared/passcode_helper': {
      exports: 'PasscodeHelper'
    }
  }
});

(function() {
  var ppFTU = navigator.mozSettings.createLock()
    .get('privacy-panel-gt-complete');
  ppFTU.onsuccess = function() {
    var ftu = ppFTU.result['privacy-panel-gt-complete'];

    if (!ftu) {
      var rootPanel = document.getElementById('root');
      rootPanel.classList.remove('current');
      rootPanel.classList.add('previous');
      document.getElementById('gt-main').classList.add('current');

      navigator.mozSettings.createLock().set({
        'privacy-panel-gt-complete': true
      });
    }
  };
})();

require([
  'panels',
  'root/main',
  'about/main',
],

function(panels, root, about) {
  root.init();

  // load all templates for guided tour sections
  panels.load('gt');
  panels.load('about', function() {
    about.init();
  });

  require([
    'ala/main',
    'rp/main',
    'tc/main',
    'sms/main'
  ],

  function(ala, rp, tc, commands) {
    // load all templates for location accuracy sections
    panels.load('ala', function() {
      ala.init();
    });

    // load all templates for remote privacy sections
    panels.load('rp', function() {
      rp.init();
    });

    // load all templates for transparency control
    panels.load('tc', function() {
      tc.init();
    });

    commands.init();
  });
});
