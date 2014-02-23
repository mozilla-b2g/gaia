requirejs.config({
  paths: {
    shared: '../shared',
    l10n: '../shared/js/l10n',
    'l10n-date': '../shared/js/l10n_date'
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
    }
  }
});
