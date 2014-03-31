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
    'shared/keyboard_helper': {
      exports: 'KeyboardHelper'
    },
    'shared/lazy_loader': {
      exports: 'LazyLoader'
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
      name: 'panels/sound/panel',
      exclude: [
        'main',
        'shared/settings_listener'
      ]
    }
  ]
});
