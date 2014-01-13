'use strict';

var MockKeyboardHelper = {
  mKeyboards: [
    {
      manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
      manifest: {
        name: 'app1',
        description: 'app1',
        permissions: {
          'settings': { 'access': 'readwrite' },
          'keyboard': {}
        },
        role: 'input',
        launch_path: '/settings.html',
        inputs: {
          'en': {
            'name': 'layout1',
            'launch_path': '/index.html#layout1',
            'description': 'layout1',
            'types': ['url', 'text'],
            enabled: true,
            'default': true
          },
          'number': {
            'name': 'layout2',
            'launch_path': '/index.html#layout2',
            'description': 'layout2',
            'types': ['number']
          }
        }
      }
    },
    {
      manifestURL: 'app://app2.gaiamobile.org/manifest.webapp',
      manifest: {
        name: 'app2',
        description: 'app2',
        permissions: {
          'settings': { 'access': 'readwrite' },
          'input': {}
        },
        role: 'input',
        launch_path: '/settings.html',
        inputs: {
          'layout1': {
            'name': 'layout1',
            'launch_path': '/index.html#layout1',
            'description': 'layout1',
            'types': ['url']
          }
        }
      }
    },
    {
      manifestURL: 'app://app3.gaiamobile.org/manifest.webapp',
      manifest: {
        name: 'app3',
        description: 'app3',
        permissions: {
          'settings': { 'access': 'readwrite' },
          'keyboard': {}
        },
        role: 'input',
        launch_path: '/settings.html',
        inputs: {
          'layout1': {
            'name': 'layout1',
            'launch_path': '/index.html#layout1',
            'description': 'layout1',
            'types': ['number'],
            enabled: true,
            'default': true
          }
        }
      }
    }
  ],
  mSetup: function() {
    this.watchCallback = null;
    // dirty clone
    this.keyboards = JSON.parse(JSON.stringify(this.mKeyboards));

    this.layouts = this.keyboards.reduce(function(carry, keyboard) {
      var inputIds = Object.keys(keyboard.manifest.inputs);
      var layouts = inputIds.map(function(layoutId) {
        var inputManifest = keyboard.manifest.inputs[layoutId];
        return {
          app: keyboard,
          manifest: keyboard.manifest,
          inputManifest: inputManifest,
          layoutId: layoutId,
          enabled: inputManifest.enabled,
          'default': inputManifest['default']
        };

      });

      return carry.concat(layouts);
    }, []);
  },
  stopWatching: function() {
    this.watchCallback = null;
  },
  getLayouts: function(options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    callback(this.layouts);
  },
  watchLayouts: function(options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    this.watchCallback = callback;
    callback(this.layouts, { apps: true, settings: true });
  },
  checkDefaults: function() {},
  setLayoutEnabled: function(manifestURL, layoutId, enabled) {
    this.layouts.some(function eachLayout(layout) {
      if (layout.app.manifestURL === manifestURL &&
          layout.layoutId === layoutId) {
        layout.enabled = enabled;
        return true;
      }
    });
  },
  saveToSettings: function() {
    if (this.watchCallback) {
      this.watchCallback(this.layouts, { settings: true });
    }
  },
  isKeyboardType: function() {
    return true;
  }
};

MockKeyboardHelper.mSuiteSetup = MockKeyboardHelper.mSetup;
