requirejs.config({
  // waitSeconds is set to the default here; the build step rewrites
  // it to 0 in build/require_config.jslike so that we never timeout
  // waiting for modules in production. This is important when the
  // device is under super-low-memory stress, as it may take a while
  // for the device to get around to loading things like Clock's alarm
  // ringing screen, and we absolutely do not want that to time out.
  waitSeconds: 0,
  paths: {
    shared: '../../shared'
  },
  shim: {
    '../../../shared/js/template': {
      exports: 'Template'
    },
    'picker/../../../../shared/js/gesture_detector': {
      exports: 'GestureDetector'
    },
    '../../../shared/js/async_storage': {
      exports: 'asyncStorage'
    },
    'panels/../../../../shared/js/async_storage': {
      exports: 'asyncStorage'
    },
    '../../../shared/js/accessibility_helper': {
      exports: 'AccessibilityHelper'
    }
  }
});
