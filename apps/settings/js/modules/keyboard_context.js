/**
 * KeyboardContext provides installed keyboard apps and enabled keyboard layouts
 * in terms of ObservableArrays. It listens to the events from KeyboardHelper
 * and update the ObservableArrays.
 * KeyboardHelper helps on the following things:
 *   - Get all installed keyboard apps and layouts.
 *   - Enable or disable keyboard layouts.
 *   - Notify keyboard layout changes via the 'keyboardsrefresh' event.
 * KeyboardContext handles only data and does not involve in any UI logic.
 *
 * @module KeyboardContext
 */
define(function(require) {
  'use strict';

  var Observable = require('modules/mvvm/observable');
  var ObservableArray = require('modules/mvvm/observable_array');
  var KeyboardHelper = require('shared/keyboard_helper');
  var ManifestHelper = require('shared/manifest_helper');

  // stores layout indexed by app manifestURL and layoutId
  var _layoutDict = null;

  var _keyboards = ObservableArray([]);
  var _enabledLayouts = ObservableArray([]);

  var _isReady = false;
  var _parsingApps = false;
  var _callbacks = [];
  var _defaultEnabledCallbacks = [];

  /**
   * @alias module:Keyboard
   * @class Keyboard
   * @param {String} name
                     The name of the keyboard.
   * @param {String} description
                     The description of the keyboard.
   * @param {String} launchPath
                     The launch path of the keyboard.
   * @param {Array} layouts
                    All layouts included in the keyboard.
   * @param {DOMApplication} app
                  The keyboard app object.
   * @returns {Keyboard}
   */
  var Keyboard = function(name, description, launchPath, layouts, app) {
    var _observable = Observable({
      name: name,
      description: description,
      launchPath: launchPath,
      layouts: layouts,
      app: app
    });

    return _observable;
  };

  /**
   * @alias module:Layout
   * @class Layout
   * @param {String} id
                     The id of the layout.
   * @param {String} appName
                     The name of the keyboard app containing the layout.
   * @param {String} appManifestURL
                     The manifest url of the keyboard app containing the layout.
   * @param {String} name
                     The name of the layout.
   * @param {String} description
                     The description of the layout.
   * @param {Array} types
                    The supported input types of the layout.
   * @param {Boolean} enabled
                      The value indicating if the layout is enabled or not.
   * @returns {Layout}
   */
  var Layout =
    function(id, appName, appManifestURL, name, description, types, enabled) {
      var _observable = Observable({
        id: id,
        appName: appName,
        name: name,
        description: description,
        types: types,
        enabled: enabled
      });

      // Layout enabled changed.
      _observable.observe('enabled', function(newValue, oldValue) {
        if (!_parsingApps) {
          KeyboardHelper.setLayoutEnabled(appManifestURL, id, newValue);
          // only check the defaults if we disabled a checkbox
          if (!newValue) {
            KeyboardHelper.checkDefaults(function(layouts, missingTypes) {
              refreshEnabledLayouts(layouts);
              notifyDefaultEnabled(layouts, missingTypes);
            });
          }
        }
      });

      return _observable;
  };

  var _waitForLayouts;

  function refreshEnabledLayouts(reEnabledLayouts) {
    reEnabledLayouts.forEach(function(layout) {
      var app = _layoutDict[layout.app.manifestURL];
      if (app) {
        app[layout.layoutId].enabled = true;
      }
    });
  }

  function notifyDefaultEnabled(layouts, missingTypes) {
    _defaultEnabledCallbacks.forEach(function withCallbacks(callback) {
      callback(layouts[0], missingTypes[0]);
    });
  }

  function updateLayouts(layouts, reason) {
    function mapLayout(layout) {
      var app = _layoutDict[layout.app.manifestURL];
      if (!app) {
        app = _layoutDict[layout.app.manifestURL] = {};
      }
      if (app[layout.layoutId]) {
        app[layout.layoutId].enabled = layout.enabled;
        return app[layout.layoutId];
      }
      app[layout.layoutId] = Layout(layout.layoutId,
        layout.manifest.name, layout.app.manifestURL,
        layout.inputManifest.name, layout.inputManifest.description,
        layout.inputManifest.types, layout.enabled);
      return app[layout.layoutId];
    }

    function reduceApps(carry, layout) {
      // if we already found this app, add it to the layouts
      if (!carry.some(function checkApp(app) {
        if (app.app === layout.app) {
          app.layouts.push(mapLayout(layout));
          return true;
        }
      })) {
        carry.push({
          app: layout.app,
          manifest: layout.manifest,
          layouts: [mapLayout(layout)]
        });
      }
      return carry;
    }

    function mapKeyboard(app) {
      return Keyboard(app.manifest.name, app.manifest.description,
        app.manifest.launch_path, app.layouts, app.app);
    }

    _parsingApps = true;

    // if we changed apps
    if (reason.apps) {
      // re parse every layout
      _layoutDict = {};
      var apps = layouts.reduce(reduceApps, []);
      var keyboards = apps.map(mapKeyboard);
      _keyboards.reset(keyboards);
    }
    var enabled = layouts.filter(function filterEnabled(layout) {
      return layout.enabled;
    }).map(mapLayout);
    _enabledLayouts.reset(enabled);

    _parsingApps = false;

    if (_waitForLayouts) {
      _waitForLayouts();
      _waitForLayouts = undefined;
    }
  }

  var _init = function(callback) {
    window.addEventListener('localized', function() {
      // refresh keyboard and layout in _keyboards
      _keyboards.forEach(function(keyboard) {
        var keyboardAppInstance = keyboard.app;
        var keyboardManifest =
          new ManifestHelper(keyboardAppInstance.manifest);
        keyboard.name = keyboardManifest.name;
        keyboard.description = keyboardManifest.description;
        keyboard.layouts.forEach(function(layout) {
          layout.appName = keyboardManifest.name;
        });
      });
    });
    _waitForLayouts = callback;
    KeyboardHelper.stopWatching();
    KeyboardHelper.watchLayouts(updateLayouts);
  };

  var _ready = function(callback) {
    if (!callback) {
      return;
    }

    if (_isReady) {
      callback();
    } else {
      _callbacks.push(callback);
    }
  };

  return {
    /**
     * Reset the keyboard context. It clears all cached data of installed
     * keyboards and current enabled layouts.
     *
     * @alias module:KeyboardContext#reset
     */
    reset: function kc_reset() {
      _layoutDict = null;
      _keyboards = ObservableArray([]);
      _enabledLayouts = ObservableArray([]);
      _isReady = false;
      _parsingApps = false;
      _callbacks = [];
      _defaultEnabledCallbacks = [];
    },

    /**
     * Initialize the keyboard context. After the context initialized, we are
     * able to get the installed keyboards and enabled layouts.
     *
     * @alias module:KeyboardContext#init
     * @param {Function} callback
     *                   The callback when the context is initialized.
     */
    init: function kc_init(callback) {
      _defaultEnabledCallbacks = [];
      _isReady = false;
      _init(function() {
        _isReady = true;
        _callbacks.forEach(function(callback) {
          callback();
        });
      });
      _ready(callback);
    },

    /**
     * Get the installed keyboards in terms of an observable array.
     *
     * @alias module:KeyboardContext#keyboards
     * @param {Function} callback
     *                   The result is passed to the callback when ready.
     */
    keyboards: function kc_keyboards(callback) {
      _ready(function() {
        callback(_keyboards);
      });
    },

    /**
     * Get the enabled layouts in terms of an observable array.
     *
     * @alias module:KeyboardContext#enabledLayouts
     * @param {Function} callback
     *                   The result is passed to the callback when ready.
     */
    enabledLayouts: function kc_enabledLayouts(callback) {
      _ready(function() {
        callback(_enabledLayouts);
      });
    },

    /**
     * Add a callback to be triggered when the default keyboard is enabled.
     *
     * @alias module:KeyboardContext#defaultKeyboardEnabled
     * @param {Function} callback
     *                   The callback to be triggered.
     */
    defaultKeyboardEnabled: function kc_defaultKeyboardEnabled(callback) {
      _defaultEnabledCallbacks.push(callback);
    }
  };
});
