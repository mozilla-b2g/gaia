/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * Helper object to find all installed keyboard apps and layouts.
 *
 * (Need mozApps.mgmt and settings permission)
 */

(function(exports) {

/**
 * The set of "basic keyboard" types
 */
var BASE_TYPES = new Set([
  'text', 'url', 'email', 'password', 'number', 'option'
]);

/**
 * The keys stored in the settings database
 */
var SETTINGS_KEYS = {
  ENABLED: 'keyboard.enabled-layouts',
  DEFAULT: 'keyboard.default-layouts'
};

// In order to provide default defaults, we need to know the default keyboard
var defaultKeyboardOrigin = 'app://keyboard.gaiamobile.org';
// support http:// version as well
if (location.protocol === 'http:') {
  defaultKeyboardOrigin = 'http://keyboard.gaiamobile.org:8080';
}

// Stores a local copy of whatever is in the settings database
var currentSettings = {
  defaultLayouts: {}
};

// until we read otherwise, asssume the default keyboards are en and number
currentSettings.defaultLayouts[defaultKeyboardOrigin] = {
  en: true,
  number: true
};

// and also assume that the defaults are the enabled
currentSettings.enabledLayouts = map2dClone(currentSettings.defaultLayouts);


/**
 * helper function for reading a value in one of the currentSettings
 */
function map2dIs(appOrigin, layoutId) {
  // force boolean true or false
  return !!(this[appOrigin] && this[appOrigin][layoutId]);
}

/**
 * helper function for setting a value to true in one of the currentSettings
 */
function map2dSet(appOrigin, layoutId) {
  if (!this[appOrigin]) {
    this[appOrigin] = {};
  }
  this[appOrigin][layoutId] = true;
}

/**
 * helper function for setting a value to false in one of the currentSettings
 * deletes the appropriate keys
 */
function map2dUnset(appOrigin, layoutId) {
  if (!this[appOrigin]) {
    return;
  }
  delete this[appOrigin][layoutId];
  if (!Object.keys(this[appOrigin]).length) {
    delete this[appOrigin];
  }
}

/**
 * helper function for cloning one of the currentSettings
 */
function map2dClone(obj) {
  var result = {};
  for (var key1 in obj) {
    result[key1] = {};
    for (var key2 in obj[key1]) {
      result[key1][key2] = obj[key1][key2];
    }
  }
  return result;
}

// callbacks when something changes
var watchQueries = [];

// holds the last result from getApps until something changes
var currentApps;

/**
 * Sends any watchers the result of their query.
 */
function kh_updateWatchers(reason) {
  if (watchQueries.length) {

    // we do a getApps in order to make sure that we have the most recent
    // app data before calling getLayouts
    KeyboardHelper.getApps(function withApps() {
      watchQueries.forEach(function eachWatchQuery(watch) {
        KeyboardHelper.getLayouts(watch.query, function withLayouts(layouts) {
          watch.callback(layouts, reason);
        });
      });
    });
  }
}

// callbacks waiting to know when settings are loaded
var waitingForSettings = [];
var loadedSettings = new Set();


/**
 * Tracks the number of settings loaded and calls the callbacks
 */
function kh_loadedSetting(setting) {
  loadedSettings.add(setting);
  if (loadedSettings.size >= Object.keys(SETTINGS_KEYS).length) {
    waitingForSettings.forEach(function(callback) {
      callback();
    });
    waitingForSettings = [];
    kh_updateWatchers({ settings: true });
  }
}

/**
 * Call a callback when the settings have loaded, or immediately if already
 * loaded.
 */
function kh_withSettings(callback) {
  if (loadedSettings.size >= Object.keys(SETTINGS_KEYS).length) {
    callback();
  } else {
    waitingForSettings.push(callback);
  }
}

/**
 * Internal helper to read the settings again
 */
function kh_getSettings() {
  loadedSettings = new Set();
  var lock = window.navigator.mozSettings.createLock();
  lock.get(SETTINGS_KEYS.DEFAULT).onsuccess = kh_parseDefault;
  lock.get(SETTINGS_KEYS.ENABLED).onsuccess = kh_parseEnabled;
}

/**
 * Parse the result from the settings query for default layouts
 */
function kh_parseDefault() {
  var value = this.result[SETTINGS_KEYS.DEFAULT];
  if (value) {
    currentSettings.defaultLayouts = value;
  }
  kh_loadedSetting(SETTINGS_KEYS.DEFAULT);
}

/**
 * Parse the result from the settings query for enabled layouts
 */
function kh_parseEnabled() {
  var value = this.result[SETTINGS_KEYS.ENABLED];
  var needsSave = false;
  if (!value) {
    currentSettings.enabledLayouts = map2dClone(currentSettings.defaultLayouts);
    needsSave = true;
  } else {
    var type = typeof value;

    // deal with the old string format - might be able to be removed once test
    // devices have been living with this new format for a bit.
    if (type === 'string') {
      try {
        currentSettings.enabledLayouts = {};
        var oldSettings = JSON.parse(value);
        oldSettings.forEach(function(layout) {
          if (layout.enabled) {
            map2dSet.call(currentSettings.enabledLayouts, layout.appOrigin,
              layout.layoutId);
          }
        });
      } catch (e) {
        currentSettings.enabledLayouts =
          map2dClone(currentSettings.defaultLayouts);
        needsSave = true;
      }
    } else {
      // if it wasn't a string, assume its our object
      currentSettings.enabledLayouts = value;
    }
  }

  kh_loadedSetting(SETTINGS_KEYS.ENABLED);

  if (needsSave) {
    KeyboardHelper.saveToSettings();
  }
}

/**
 * Creates an object that describes a keyboard layout.  The objects prototype
 * will give it accessors for 'default' and 'enabled' that will read or change
 * the proper setting from currentSettings.
 *
 * @constructor
 */
function KeyboardLayout(options) {
  for (var key in options) {
    this[key] = options[key];
  }
}

Object.defineProperties(KeyboardLayout.prototype, {
  'default': {
    get: function kh_getLayoutIsDefault() {
      return map2dIs.call(
        currentSettings.defaultLayouts, this.app.origin, this.layoutId
      );
    }
  },
  enabled: {
    get: function kh_getLayoutIsEnabled() {
      return map2dIs.call(
        currentSettings.enabledLayouts, this.app.origin, this.layoutId
      );
    },
    set: function kh_setLayoutIsDefault(value) {
      var method = value ? map2dSet : map2dUnset;
      method.call(currentSettings.enabledLayouts,
        this.app.origin, this.layoutId);
    }
  }
});

/**
 * Exposed as KeyboardHelper.settings this gives us a fairly safe way to read
 * and write to the settings data structures directly.
 */
var kh_SettingsHelper = {};
Object.defineProperties(kh_SettingsHelper, {
  'default': {
    get: function() {
      return map2dClone(currentSettings.defaultLayouts);
    },
    set: function(value) {
      currentSettings.defaultLayouts = map2dClone(value);
    },
    enumerable: true
  },
  'enabled': {
    get: function() {
      return map2dClone(currentSettings.enabledLayouts);
    },
    set: function(value) {
      currentSettings.enabledLayouts = map2dClone(value);
    },
    enumerable: true
  }
});

var KeyboardHelper = exports.KeyboardHelper = {
  settings: kh_SettingsHelper,

  /**
   * Listen for changes in settings or apps and read the deafault settings
   */
  init: function kh_init() {
    watchQueries = [];
    currentApps = undefined;
    // load the current settings, and watch for changes to settings
    var settings = window.navigator.mozSettings;
    if (settings) {
      kh_getSettings();
      settings.addObserver(SETTINGS_KEYS.ENABLED, kh_getSettings);
      settings.addObserver(SETTINGS_KEYS.DEFAULT, kh_getSettings);
    }

    window.addEventListener('applicationinstallsuccess', this);
    window.addEventListener('applicationuninstall', this);
  },

  /**
   * Handles the application changed events.  Clears the cache and updates
   * any listening watchers.
   */
  handleEvent: function(event) {
    currentApps = undefined;
    kh_updateWatchers({ apps: true });
  },

  /**
   * If this is a basic keyboard type
   */
  isKeyboardType: function kh_isKeyboardType(type) {
    return BASE_TYPES.has(type);
  },

  /**
   * Enables or disables a layout based on origin and layoutId
   */
  setLayoutEnabled: function kh_setLayoutEnabled(appOrigin, layoutId, enabled) {
    var method = enabled ? map2dSet : map2dUnset;
    method.call(currentSettings.enabledLayouts, appOrigin, layoutId);
  },

  /**
   * Returns true if the layout specified by origin and layoutId is enabled.
   */
  getLayoutEnabled: function kh_getLayoutEnabled(appOrigin, layoutId) {
    return map2dIs.call(currentSettings.enabledLayouts, appOrigin, layoutId);
  },

  /**
   * Checks the currently enabled layouts to ensure there is at least one
   * 'text', 'url' and 'number' keyboard enabled.  If there is not, it will
   * enable the corresponding default keyboard.
   *
   * Only calls the callback if a default was enabled, and passes an array
   * of layouts that were enabled.
   */
  checkDefaults: function kh_checkDefaults(callback) {
    var layoutsEnabled = [];
    ['text', 'url', 'number'].forEach(function eachType(type) {
      // getLayouts is sync when we already have data
      var enabled;
      this.getLayouts({ type: type, enabled: true }, function(layouts) {
        enabled = layouts.length;
      });
      if (!enabled) {
        this.getLayouts({ type: type, 'default': true }, function(layouts) {
          if (layouts[0]) {
            layouts[0].enabled = true;
            layoutsEnabled.push(layouts[0]);
          }
        });
      }
    }, this);

    if (layoutsEnabled.length) {
      if (callback) {
        callback(layoutsEnabled);
      }
    }
  },

  /**
   * Saves the current state to settings.  None of the changes made will be
   * saved automatically by KeyboardHelper.  This allows someone to batch
   * whatever settings changes are nessecary, then call save.
   */
  saveToSettings: function ke_saveToSettings() {
    var toSet = {};
    toSet[SETTINGS_KEYS.ENABLED] = currentSettings.enabledLayouts;
    toSet[SETTINGS_KEYS.DEFAULT] = currentSettings.defaultLayouts;
    window.navigator.mozSettings.createLock().set(toSet);
  },

  /**
   * Get a list of current keyboard applications.  Will call callback
   * immediately if the data is already cached locally.  Will not call callback
   * if for some reason no apps are found.
   */
  getApps: function kh_getApps(callback) {
    if (!navigator.mozApps || !navigator.mozApps.mgmt) {
      return;
    }

    if (currentApps) {
      return callback(currentApps);
    }

    navigator.mozApps.mgmt.getAll().onsuccess = function onsuccess(event) {
      var keyboardApps = event.target.result.filter(function filterApps(app) {
        // keyboard apps will set role as 'keyboard'
        // https://wiki.mozilla.org/WebAPI/KeboardIME#Proposed_Manifest_of_a_3rd-Party_IME
        if (!app.manifest || 'keyboard' !== app.manifest.role) {
          return;
        }
        //XXX remove this hard code check if one day system app no longer
        //    use mozKeyboard API
        if (app.origin === 'app://system.gaiamobile.org') {
          return;
        }
        // all keyboard apps should define its layout(s) in entry_points section
        if (!app.manifest.entry_points) {
          return;
        }
        return true;
      });


      if (keyboardApps.length) {
        // every time we get a list of apps, clean up the settings
        Object.keys(currentSettings.enabledLayouts)
          .concat(Object.keys(currentSettings.defaultLayouts))
          .forEach(function(origin) {
            // if the origin doesn't exist in the list of apps, delete it
            // from the settings maps
            if (!keyboardApps.some(function(app) {
              return app.origin === origin;
            })) {
              delete currentSettings.enabledLayouts[origin];
              delete currentSettings.defaultLayouts[origin];
            }
          });
        currentApps = keyboardApps;
        callback(keyboardApps);
      }
    };
  },

  /**
   * Requests an array of layouts matching an optional set of search params.
   * Calls the callback when data is received, or immediately if already
   * cached locally.
   *
   * options.default - When true, only default layouts are returned.
   * options.enabled - When true, only enabled layouts are returned.
   * options.type - A string, or array of strings.  Layouts filtered to type.
   */
  getLayouts: function kh_getLayouts(options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    function withApps(apps) {
      var layouts = apps.reduce(function eachApp(result, app) {

        var manifest = new ManifestHelper(app.manifest);
        for (var layoutId in manifest.entry_points) {
          var entryPoint = manifest.entry_points[layoutId];
          if (!entryPoint.types) {
            console.warn(app.origin, layoutId, 'did not declare type.');
            continue;
          }

          var layout = new KeyboardLayout({
            app: app,
            manifest: manifest,
            entryPoint: entryPoint,
            layoutId: layoutId
          });

          if (options['default'] && !layout['default']) {
            continue;
          }

          if (options.enabled && !layout.enabled) {
            continue;
          }

          if (options.type) {
            options.type = [].concat(options.type);
            // check for any type in our options to be any type in the layout
            if (!options.type.some(function(type) {
              return entryPoint.types.indexOf(type) !== -1;
            })) {
              continue;
            }
          }

          result.push(layout);
        }

        // sort the default query by most specific keyboard
        if (options['default']) {
          result.sort(function(a, b) {
            return a.entryPoint.types.length - b.entryPoint.types.length;
          });
        }
        return result;
      }, []);

      kh_withSettings(callback.bind(null, layouts));
    }

    this.getApps(withApps);
  },

  /**
   * Clears all watch queries
   */
  stopWatching: function() {
    watchQueries = [];
  },

  /**
   * Calls the callback whenever settings or apps are changed. The query is
   * passed onto getLayouts. The callback will be called as soon as the current
   * settings and apps are loaded as well.
   *
   * The callback will be passed an array of layouts, and a reason object.
   * I.E. function callback(layouts, reason) {}
   * reason.apps will be true when apps have changed, and reason.settings
   * will be true if settings changed.  Both will be true on the first
   * callback.
   */
  watchLayouts: function(query, callback) {
    if (typeof query === 'function') {
      callback = query;
      query = {};
    }

    var watch = {
      query: query,
      callback: callback
    };
    watchQueries.push(watch);

    this.getLayouts(query, function initialCall(layouts) {
      watch.layouts = layouts;
      callback(layouts, { apps: true, settings: true });
    });
  }
};

KeyboardHelper.init();

}(window));
