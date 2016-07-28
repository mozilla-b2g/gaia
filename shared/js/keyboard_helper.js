'use strict';
/* global InputAppList, ManifestHelper */

/**
 * Helper object to find all installed keyboard apps and layouts.
 *
 * (Need mozApps.mgmt and settings permission)
 */

(function(exports) {
/* jshint validthis: true */

/**
 * The set of 'basic keyboard' types
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
var defaultKeyboardManifestURL =
  'chrome://gaia/content/keyboard/manifest.webapp';

// Stores a local copy of whatever is in the settings database
var currentSettings = {
  defaultLayouts: {}
};

// until we read otherwise, asssume the default keyboards are en and number
currentSettings.defaultLayouts[defaultKeyboardManifestURL] = {
  en: true,
  number: true
};

// and also assume that the defaults are the enabled
currentSettings.enabledLayouts = map2dClone(currentSettings.defaultLayouts);

/**
 * helper function for reading a value in one of the currentSettings
 */
function map2dIs(manifestURL, layoutId) {
  // force boolean true or false
  return !!(this[manifestURL] && this[manifestURL][layoutId]);
}

/**
 * helper function for setting a value to true in one of the currentSettings
 */
function map2dSet(manifestURL, layoutId) {
  if (!this[manifestURL]) {
    this[manifestURL] = {};
  }
  this[manifestURL][layoutId] = true;
}

/**
 * helper function for setting a value to false in one of the currentSettings
 * deletes the appropriate keys
 */
function map2dUnset(manifestURL, layoutId) {
  if (!this[manifestURL]) {
    return;
  }
  delete this[manifestURL][layoutId];
  if (!Object.keys(this[manifestURL]).length) {
    delete this[manifestURL];
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

// Hold the mapping between locale -> layout
var defaultLayoutConfig = {
  locales: {
    'af': [ 'af', 'en' ],
    'am': [ 'en' ],
    'ar': [ 'ar', 'en' ],
    'as': [ 'en' ],
    'bg': [ 'bg-BDS', 'en' ],
    'bm': [ 'en' ],
    'bn-BD': [ 'bn-Avro', 'bn-Probhat', 'en' ],
    'bn-IN': [ 'bn-Avro', 'bn-Probhat', 'en' ],
    'bs': [ 'bs' ],
    'ca': [ 'ca' ],
    'cs': [ 'cs' ],
    'cy': [ 'cy' ],
    'da': [ 'da' ],
    'de': [ 'de' ],
    'dsb': [ 'en' ],
    'ee': [ 'en-Africa' ],
    'el': [ 'el', 'en' ],
    'en-GB': [ 'en-GB' ],
    'en-US': [ 'en' ],
    'eo': [ 'eo' ],
    'es': [ 'es' ],
    'et': [ 'en' ],
    'eu': [ 'eu', 'es', 'fr', 'en' ],
    'fa': [ 'en' ],
    'ff': [ 'ff', 'fr', 'en' ],
    'fi': [ 'en' ],
    'fr': [ 'fr' ],
    'fy-NL': [ 'fy' ],
    'ga-IE': [ 'ga' ],
    'gd': [ 'gd' ],
    'gl': [ 'es' ],
    'ha': [ 'en-Africa' ],
    'he': [ 'he', 'en' ],
    'hi-IN': [ 'hi', 'en' ],
    'hr': [ 'hr' ],
    'hsb': [ 'en' ],
    'ht': [ 'en' ],
    'hu': [ 'hu' ],
    'hy-AM': [ 'en' ],
    'id': [ 'en' ],
    'ig': [ 'en-Africa' ],
    'it': [ 'it' ],
    'ja': [ 'jp-kanji', 'en' ],
    'ko': [ 'ko', 'en' ],
    'lg': [ 'en-Africa' ],
    'lij': [ 'en' ],
    'ln': [ 'en-Africa' ],
    'lv': [ 'lv' ],
    'mk': [ 'mk' ],
    'ml': [ 'en' ],
    'mg': [ 'en' ],
    'mr': [ 'en' ],
    'my': [ 'my' ],
    'nb': [ 'nb' ],
    'nl': [ 'nl' ],
    'or': [ 'en' ],
    'pa': [ 'en' ],
    'pl': [ 'pl' ],
    'pt-BR': [ 'pt-BR' ],
    'pt-PT': [ 'pt-PT' ],
    'fr-x-psaccent': [ 'en' ],
    'ar-x-psbidi': [ 'en' ],
    'ro': [ 'ro' ],
    'ru': [ 'ru', 'en' ],
    'sk': [ 'sk' ],
    'sl': [ 'en' ],
    'son': [ 'en' ],
    'sq': [ 'sq' ],
    'sr': [ 'sr-Cyrl', 'sr-Latn' ],
    'sr-Cyrl': [ 'sr-Cyrl' ],
    'sr-Latn': [ 'sr-Latn' ],
    'sv-SE': [ 'sv' ],
    'sw': [ 'en-Africa' ],
    'ta': [ 'ta', 'en' ],
    'te': [ 'en' ],
    'th': [ 'th' ],
    'tn': [ 'en-Africa' ],
    'tl': [ 'en' ],
    'tr': [ 'tr-Q', 'tr-F' ],
    'uk': [ 'uk' ],
    'ur': [ 'en' ],
    'vi': [ 'vi-Typewriter', 'fr' ],
    'wo': [ 'wo' ],
    'xh': [ 'en-Africa' ],
    'yo': [ 'en-Africa' ],
    'zam': [ 'es-Americas', 'es' ],
    'zh-CN': [ 'zh-Hans-Pinyin', 'en' ],
    'zh-TW': [ 'zh-Hant-Zhuyin', 'en' ],
    'zu': [ 'en-Africa' ]
  },
  langIndependentLayouts: [ 'number' ],
  fallbackLayouts: [ 'en' ]
};

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
            var manifestURL = layout.manifestURL;
            if (!manifestURL) {
              manifestURL = layout.appOrigin + '/manifest.webapp';
            }
            map2dSet.call(currentSettings.enabledLayouts, manifestURL,
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
        currentSettings.defaultLayouts, this.app.manifestURL, this.layoutId
      );
    }
  },
  enabled: {
    get: function kh_getLayoutIsEnabled() {
      return map2dIs.call(
        currentSettings.enabledLayouts, this.app.manifestURL, this.layoutId
      );
    },
    set: function kh_setLayoutIsDefault(value) {
      var method = value ? map2dSet : map2dUnset;
      method.call(currentSettings.enabledLayouts,
        this.app.manifestURL, this.layoutId);
    }
  }
});

/**
 * Exposed as KeyboardHelper.settings this gives us a fairly safe way to read
 * and write to the settings data structures directly.
 * XXX: is this really used anywhere?
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

  // bug 1035117: define the fallback layout for a group if no layout has been
  // selected for that group (if it's not enforced in settings)
  // please see the bug and its related UX spec for the sense of 'fallback'
  fallbackLayoutNames: {
    password: 'en'
  },

  fallbackLayouts: {},

  // InputAppList manages the current input apps for us.
  inputAppList: null,

  /**
   * Listen for changes in settings or apps and read the deafault settings
   */
  init: function kh_init() {
    watchQueries = [];

    this.inputAppList = new InputAppList();
    this.inputAppList.onupdate =
      kh_updateWatchers.bind(undefined, { apps: true });
    this.inputAppList.start();

    // load the current settings, and watch for changes to settings
    var settings = window.navigator.mozSettings;
    if (!settings) {
      console.error('KeyboardHelper: No mozSettings!');
      return;
    }

    kh_getSettings();
    settings.addObserver(SETTINGS_KEYS.ENABLED, kh_getSettings);
    settings.addObserver(SETTINGS_KEYS.DEFAULT, kh_getSettings);

    window.addEventListener('applicationinstallsuccess', this);
  },

  /**
   * Handles the application changed events.  Clears the cache and updates
   * any listening watchers.
   */
  handleEvent: function(event) {
    kh_updateWatchers({ apps: true });
  },

  /**
   * If this is a basic keyboard type
   */
  isKeyboardType: function kh_isKeyboardType(type) {
    return BASE_TYPES.has(type);
  },

  /**
   * Enables or disables a layout based on manifest URL and layoutId
   */
  setLayoutEnabled: function kh_setLayoutEnabled(manifestURL, layoutId,
                                                 enabled) {
    var method = enabled ? map2dSet : map2dUnset;
    method.call(currentSettings.enabledLayouts, manifestURL, layoutId);
  },

  /**
   * Returns true if the layout specified by manifest URL and layoutId is
   * enabled.
   */
  getLayoutEnabled: function kh_getLayoutEnabled(manifestURL, layoutId) {
    return map2dIs.call(currentSettings.enabledLayouts, manifestURL, layoutId);
  },

  /**
   * set/unset a layout as default based on manifest URL and layoutId
   */
  setLayoutIsDefault: function kh_setLayoutIsDefault(manifestURL, layoutId,
                                                     enabled) {
    var method = enabled ? map2dSet : map2dUnset;
    method.call(currentSettings.defaultLayouts, manifestURL, layoutId);
  },

  /**
   * Returns true if the layout specified by manifest URL and layoutId
   * is default.
   */
  getLayoutIsDefault: function kh_getLayoutIsDefault(manifestURL, layoutId) {
    return map2dIs.call(currentSettings.defaultLayouts, manifestURL, layoutId);
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
    var missingTypes = [];
    ['text', 'url', 'number'].forEach(function eachType(type) {
      // getLayouts is sync when we already have data
      var enabled;
      this.getLayouts({ type: type, enabled: true }, function(layouts) {
        enabled = layouts.length;
      });
      if (!enabled) {
        missingTypes.push(type);
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
        callback(layoutsEnabled, missingTypes);
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
   * Get a list of current keyboard applications.
   */
  getApps: function kh_getApps(callback) {
    // every time we get a list of apps, clean up the settings
    var cleanupSettings = function(inputApps) {
      Object.keys(currentSettings.enabledLayouts)
        .concat(Object.keys(currentSettings.defaultLayouts))
        .forEach(function(manifestURL) {
          // if the manifestURL doesn't exist in the list of apps, delete it
          // from the settings maps
          if (!inputApps.some(function(inputApp) {
            return (inputApp.domApp.manifestURL === manifestURL);
          })) {
            delete currentSettings.enabledLayouts[manifestURL];
            delete currentSettings.defaultLayouts[manifestURL];
          }
        });
    };

    // XXX We have to preserve the original getApps() behavior here,
    // i.e. call the sync callback when we already have the data.
    if (this.inputAppList.ready) {
      var inputApps = this.inputAppList.getListSync();
      cleanupSettings(inputApps);
      callback(inputApps);

      return;
    }

    this.inputAppList.getList().then(function(inputApps) {
      cleanupSettings(inputApps);
      callback(inputApps);
    })['catch'](function(e) { // workaround gjslint error
      console.error(e);
    });
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

    function withApps(inputApps) {
      /* jshint loopfunc: true */
      // we'll delete keys in this active copy (= the purpose of copying)
      var fallbackLayoutNames = {};
      for (var group in this.fallbackLayoutNames) {
        fallbackLayoutNames[group] = this.fallbackLayoutNames[group];
      }
      this.fallbackLayouts = {};

      var layouts = inputApps.reduce(function eachApp(result, inputApp) {
        var domApp = inputApp.domApp;

        var manifest = new ManifestHelper(domApp.manifest);
        var inputs = inputApp.getInputs();
        for (var layoutId in inputs) {
          var inputManifest = inputs[layoutId];
          if (!inputManifest.types) {
            console.warn(domApp.manifestURL, layoutId, 'did not declare type.');
            continue;
          }

          var layout = new KeyboardLayout({
            app: domApp,
            inputApp: inputApp,
            manifest: manifest,
            inputManifest: inputManifest,
            layoutId: layoutId
          });

          // bug 1035117: insert a fallback layout regardless of its
          // and enabledness
          // XXX: we only do this for built-in keyboard?
          if (domApp.manifestURL === defaultKeyboardManifestURL) {
            for (var group in fallbackLayoutNames) {
              if (layoutId === fallbackLayoutNames[group]) {
                this.fallbackLayouts[group] = layout;
                delete fallbackLayoutNames[group];
              }
            }
          }

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
              return inputManifest.types.indexOf(type) !== -1;
            })) {
              continue;
            }
          }

          result.push(layout);
        }

        // sort the default query by most specific keyboard
        if (options['default']) {
          result.sort(function(a, b) {
            return a.inputManifest.types.length - b.inputManifest.types.length;
          });
        }
        return result;
      }.bind(this), []);

      kh_withSettings(callback.bind(null, layouts));
    }

    this.getApps(withApps.bind(this));
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
  },

  // Change the default layouts set according to the language
  // locale: the current system language, used to look up the mapping table
  // reset: if set as true, will reset the current enabled layouts
  changeDefaultLayouts: function kh_changeDefaultLayouts(locale, reset) {
    this.getApps(function(inputApps) {
      var defaultInputApp = inputApps.find(function(inputApp) {
        return inputApp.domApp.manifestURL === defaultKeyboardManifestURL;
      });

      if (!defaultInputApp) {
        console.error('KeyboardHelper: Built-in Keyboard app not installed!');
        return;
      }

      // reset the set of default layouts
      currentSettings.defaultLayouts = {};

      // set the language-independent default layouts
      var langIndependentLayouts = defaultLayoutConfig.langIndependentLayouts;
      for (var i = langIndependentLayouts.length - 1; i >= 0; i--) {
        this.setLayoutIsDefault(
          defaultKeyboardManifestURL, langIndependentLayouts[i], true);
      }

      if (reset) {
        // reset the set of enabled layouts
        currentSettings.enabledLayouts =
          map2dClone(currentSettings.defaultLayouts);
      }

      var layoutsToAdd;
      if (defaultLayoutConfig.locales[locale]) {
        layoutsToAdd = defaultLayoutConfig.locales[locale];
      } else {
        console.warn('KeyboardHelper: Unknown locale; use fallback layouts.');
        layoutsToAdd = [];
      }

      // Check if the layouts are available first
      layoutsToAdd = layoutsToAdd.filter(function(inputId) {
        return !!defaultInputApp.getInputs()[inputId];
      });

      if (layoutsToAdd.length === 0) {
        layoutsToAdd = defaultLayoutConfig.fallbackLayouts;
      }

      // Enable the language specific keyboard layout group,
      // or the fallback layouts.
      for (i = layoutsToAdd.length - 1; i >= 0; i--) {
        this.setLayoutIsDefault(
          defaultKeyboardManifestURL, layoutsToAdd[i], true);
        this.setLayoutEnabled(
          defaultKeyboardManifestURL, layoutsToAdd[i], true);
      }

      this.saveToSettings(); // save changes to settings
    }.bind(this));
  }
};

KeyboardHelper.init();

}(window));
