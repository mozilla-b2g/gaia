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
    }
  }
});

require([
  'panels',
  'root/main',
  'ala/main',
  'rpp/main',
  'sms/main'
],

function(panels, root, ala, rpp, commands) {
  root.init();

  // load all templates for guided tour sections
  panels.load('gt');

  // load all templates for location accuracy sections
  panels.load('ala', function() {
    ala.init();
  });

  // load all templates for remote privacy sections
  panels.load('rpp', function() {
    rpp.init();
  });

  commands.init();
});
