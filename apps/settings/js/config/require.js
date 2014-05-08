// Notice: 
// shim should be the same as build/settings.build.jslike::paths
// in alphabet order.
// every required file in shared should be explicitly exclude in modules
require.config({
  baseUrl: '/js',
  paths: {
    'modules': 'modules',
    'panels': 'panels',
    'shared': '../shared/js'
  },
  shim: {
    'settings': {
      exports: 'Settings'
    },
    'shared/async_storage': {
      exports: 'AsyncStorage'
    },
    'shared/keyboard_helper': {
      exports: 'KeyboardHelper'
    },
    'shared/lazy_loader': {
      exports: 'LazyLoader'
    },
    'shared/manifest_helper': {
      exports: 'ManifestHelper'
    },
    'shared/omadrm/fl': {
      exports: 'ForwardLock'
    },
    'shared/screen_layout': {
      exports: 'ScreenLayout'
    },
    'shared/settings_listener': {
      exports: 'SettingsListener'
    }
  },
  modules: [
    {
      name: 'main'
    },
    {
      name: 'panels/languages/panel',
      exclude: [
        'main',
        'shared/keyboard_helper'
      ]
    },
    {
      name: 'panels/send_feedback/panel',
      exclude: ['main']
    },
    {
      name: 'panels/choose_feedback/panel',
      exclude: ['main']
    },
    {
      name: 'panels/help/panel',
      exclude: ['main']
    },
    {
      name: 'panels/app_permissions_detail/panel',
      exclude: [
        'main',
        'shared/manifest_helper'
      ]
    },
    {
      name: 'panels/app_permissions_list/panel',
      exclude: ['main']
    },
    {
      name: 'panels/screen_lock/panel',
      exclude: ['main']
    },
    {
      name: 'panels/screen_lock_passcode/panel',
      exclude: [
        'main',
        'shared/manifest_helper',
        'shared/settings_listener'
      ]
    },
    {
      name: 'panels/sound/panel',
      exclude: [
        'main',
        'shared/omadrm/fl',
        'shared/settings_listener'
      ]
    }
  ]
});
