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
    'shared/lazy_loader': {
      exports: 'LazyLoader'
    },
    'shared/screen_layout': {
      exports: 'ScreenLayout'
    },
    'shared/keyboard_helper': {
      exports: 'KeyboardHelper'
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
    }
  ]
});
