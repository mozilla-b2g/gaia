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
    }
  },
  modules: [
    {
      name: 'main'
    },
    {
      name: 'panels/support_panel',
      exclude: ['main']
    }
  ]
});
