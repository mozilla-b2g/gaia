requirejs.config({
  baseUrl: '/js',

  // 'paths' lets us alias complex
  // paths to something simpler.

  paths: {
    'l10n': '../shared/js/l10n',
    'l10n-date': '../shared/js/l10n_date',
    'template': '../shared/js/template',
    'enumerate-all': '../shared/js/device_storage/enumerate_all',
    'mediadb': '../shared/js/mediadb',
    'lazy-loader': '../shared/js/lazy_loader',
    'font-size-utils': '../shared/js/font_size_utils',
    'media-utils': '../shared/js/media/media_utils',
    'screen-layout': '../shared/js/screen_layout',
    'screen-detector': '../shared/js/screen_detector',
    'downsample': '../shared/js/media/downsample',
    'scroll-detector': '../shared/js/media/scroll_detector',
    'dialogs': '../shared/js/media/dialogs',
    'asyncStorage': '../shared/js/async_storage',
    'performance-testing-helper': '../shared/js/performance_testing_helper',
    'debug': '../bower_components/debug/index',
    'model': '../bower_components/model/index',
    'evt': '../bower_components/evt/index'
  },

  // 'shim' config lets us `require()` packages
  // that don't have an AMD define call.
  shim: {
    'performance-testing-helper': {
      exports: 'PerformanceTestingHelper'
    }
  }

});
