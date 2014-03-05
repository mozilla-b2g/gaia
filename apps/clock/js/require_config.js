requirejs.config({
  paths: {
    shared: '../shared'
  },
  shim: {
    'shared/js/template': {
      exports: 'Template'
    },
    emitter: {
      exports: 'Emitter'
    },
    'shared/js/gesture_detector': {
      exports: 'GestureDetector'
    },
    'shared/js/async_storage': {
      exports: 'asyncStorage'
    },
    'shared/js/l10n_date': ['shared/js/l10n']
  }
});
