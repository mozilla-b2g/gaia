'use strict';

var KeyboardHelper = {
  keyboards: null,
  keyboardSettings: null,

  _setup: function() {
    this._init();
  },
  _teardown: function() {
    this._init();
  },
  _init: function() {
    this.keyboards = [
      {
        origin: 'app://app1.gaiamobile.org',
        manifest: {
          name: 'app1',
          description: 'app1',
          permissions: {
            'settings': { 'access': 'readwrite' },
            'keyboard': {}
          },
          role: 'keyboard',
          launch_path: '/settings.html',
          entry_points: {
            'layout1': {
              'name': 'layout1',
              'launch_path': '/index.html#layout1',
              'description': 'layout1',
              'types': ['url', 'text']
            },
            'layout2': {
              'name': 'layout2',
              'launch_path': '/index.html#layout2',
              'description': 'layout2',
              'types': ['number', 'text']
            }
          }
        }
      },
      {
        origin: 'app://app2.gaiamobile.org',
        manifest: {
          name: 'app2',
          description: 'app2',
          permissions: {
            'settings': { 'access': 'readwrite' },
            'keyboard': {}
          },
          role: 'keyboard',
          launch_path: '/settings.html',
          entry_points: {
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
        origin: 'app://app3.gaiamobile.org',
        manifest: {
          name: 'app3',
          description: 'app3',
          permissions: {
            'settings': { 'access': 'readwrite' },
            'keyboard': {}
          },
          role: 'keyboard',
          launch_path: '/settings.html',
          entry_points: {
            'layout1': {
              'name': 'layout1',
              'launch_path': '/index.html#layout1',
              'description': 'layout1',
              'types': ['number']
            }
          }
        }
      }
    ];

    this.keyboardSettings = [
      {
        appOrigin: 'app://app1.gaiamobile.org',
        layoutId: 'layout1',
        enabled: true
      },
      {
        appOrigin: 'app://app1.gaiamobile.org',
        layoutId: 'layout2',
        enabled: false
      },
      {
        appOrigin: 'app://app2.gaiamobile.org',
        layoutId: 'layout1',
        enabled: false
      },
      {
        appOrigin: 'app://app3.gaiamobile.org',
        layoutId: 'layout1',
        enabled: true
      }
    ];
  },

  getInstalledKeyboards: function(callback) {
    callback(this.keyboards);
  },
  setLayoutEnabled: function(appOrigin, layoutId, enabled) {
    for (var i = 0; i < this.keyboardSettings.length; i++) {
      var layout = this.keyboardSettings[i];
      if (layout.appOrigin === appOrigin &&
          layout.layoutId === layoutId) {
        layout.enabled = enabled;

        var evt = document.createEvent('CustomEvent');
        evt.initCustomEvent('keyboardsrefresh', true, false, {});
        window.dispatchEvent(evt);
      }
    }
  }
};

KeyboardHelper._init();
