
dump('======== browser-helper: content.js loaded ========\n')

function debug(str) {
  //dump('browser-helper (frame-script): ' + str + '\n');
}

let CC = Components.Constructor;
let Cc = Components.classes;
let Ci = Components.interfaces;
let Cu = Components.utils;
let Cr = Components.results;

Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/Keyboard.jsm');

// Various helpers coming from /b2g/chrome/content/shell.js
function getContentWindow() {
  return content;
}

function sendChromeEvent(details, type) {
  type = type || 'mozChromeEvent';
  let content = getContentWindow();
  details = details || {};

  let event = content.document.createEvent('CustomEvent');
  event.initCustomEvent(type, true, true,
                        Cu.cloneInto(details, content));
  content.dispatchEvent(event);
}

// Listen for app.launch calls and forward them to the the system app.
// Copy of /b2g/chrome/content/shell.js
Cu.import('resource://gre/modules/Webapps.jsm');
Cu.import('resource://gre/modules/AppsUtils.jsm');

Services.obs.addObserver(function onLaunch(subject, topic, data) {
  let json = JSON.parse(data);

  DOMApplicationRegistry.getManifestFor(json.manifestURL).then((aManifest) => {
    if (!aManifest)
      return;

    let manifest = new ManifestHelper(aManifest, json.origin);
    let data = {
      'timestamp': json.timestamp,
      'url': manifest.fullLaunchPath(json.startPoint),
      'manifestURL': json.manifestURL
    };
    sendChromeEvent(data, 'webapps-launch');
  });
}, 'webapps-launch', false);


// Listen for system messages and relay them to Gaia.
// Copy of /b2g/chrome/content/shell.js
// XXX This code should be loaded in the activities/ extension
Services.obs.addObserver(function onSystemMessage(subject, topic, data) {
  let msg = JSON.parse(data);

  let origin = Services.io.newURI(msg.manifest, null, null).prePath;
  sendChromeEvent({
    url: msg.uri,
    manifestURL: msg.manifest,
    isActivity: (msg.type == 'activity'),
    target: msg.target,
    expectingSystemMessage: true
  }, 'open-app');
}, 'system-messages-open-app', false);

Services.obs.addObserver(function(aSubject, aTopic, aData) {
  let data = JSON.parse(aData);
  sendChromeEvent({
    type: 'activity-done',
    success: data.success,
    manifestURL: data.manifestURL,
    pageURL: data.pageURL
  });
}, 'activity-done', false);



// =================== Settings ====================
// Copy of /b2g/chrome/content/settings.js
var SettingsListener = {
  _callbacks: {},

  init: function sl_init() {
    if ('mozSettings' in content.navigator && content.navigator.mozSettings) {
      content.navigator.mozSettings.onsettingchange = this.onchange.bind(this);
    }
  },

 onchange: function sl_onchange(evt) {
    var callback = this._callbacks[evt.settingName];
    if (callback) {
      callback(evt.settingValue);
    }
  },

  observe: function sl_observe(name, defaultValue, callback) {
    var settings = content.navigator.mozSettings;
    if (!settings) {
      content.setTimeout(function() { callback(defaultValue); });
      return;
    }

    if (!callback || typeof callback !== 'function') {
      throw new Error('Callback is not a function');
    }

    var req = settings.createLock().get(name);
    req.addEventListener('success', (function onsuccess() {
      callback(typeof(req.result[name]) != 'undefined' ?
        req.result[name] : defaultValue);
    }));

    this._callbacks[name] = callback;
  }
};

SettingsListener.init();

// =================== Languages ====================
// Modified copy of /b2g/chrome/content/settings.js
SettingsListener.observe('language.current', 'en-US', function(value) {
  Services.prefs.setCharPref('general.useragent.locale', value);

  let prefName = 'intl.accept_languages';
  if (Services.prefs.prefHasUserValue(prefName)) {
    Services.prefs.clearUserPref(prefName);
  }

  let intl = '';
  try {
    intl = Services.prefs.getComplexValue(prefName,
                                        Ci.nsIPrefLocalizedString).data;
  } catch(e) {}

  // Bug 830782 - Homescreen is in English instead of selected locale after
  // the first run experience.
  // In order to ensure the current intl value is reflected on the child
  // process let's always write a user value, even if this one match the
  // current localized pref value.
  if (!((new RegExp('^' + value + '[^a-z-_] *[,;]?', 'i')).test(intl))) {
    value = value + ', ' + intl;
  } else {
    value = intl;
  }
  Services.prefs.setCharPref(prefName, value);

  //XXX: modification of settings.js here:
  var window = getContentWindow();
  if (!('hasStarted' in window) && window.hasStarted != true) {
    window.hasStarted = true;

    window.addEventListener('load', function onload() {
      window.removeEventListener('load', onload);
      window.setTimeout(function() {
        sendChromeEvent({'type': 'webapps-registry-ready'});
      });
    });
  }
});

/**
 * This code comes from b2g/chrome/content/shell.js
 * For now just the keyboard stuff, should copy everything over at some point
 */
getContentWindow().addEventListener('mozContentEvent', function(evt) {
  let detail = evt.detail;
  debug('XXX FIXME : Got a mozContentEvent: ' + detail.type + "\n");

  switch(detail.type) {
    case 'inputmethod-update-layouts':
      KeyboardHelper.handleEvent(detail);
      break;
  }
});

let KeyboardHelper = {
  handleEvent: function keyboard_handleEvent(aMessage) {
    Keyboard.setLayouts(aMessage.layouts);
  }
};
