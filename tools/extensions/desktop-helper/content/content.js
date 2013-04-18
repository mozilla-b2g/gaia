
dump('======== desktop-helper: content.js loaded ========\n')

function debug(str) {
  dump('desktop-helper (frame-script): ' + str + '\n');
}

let CC = Components.Constructor;
let Cc = Components.classes;
let Ci = Components.interfaces;
let Cu = Components.utils;
let Cr = Components.results;

Cu.import('resource://gre/modules/Services.jsm');

const kChromeRootPath = 'chrome://desktop-helper.js/content/data/';

// XXX Scripts should be loaded based on the permissions of the apps not
// based on the domain.
const kScriptsPerDomain = {
  '.gaiamobile.org': [
    'ffos_runtime.js',
    'lib/bluetooth.js',
    'lib/cameras.js',
    'lib/mobile_connection.js',
    'lib/wifi.js'
  ],

  // App specific includes
  'communications.gaiamobile.org': [
    'workloads/contacts.js'
  ],

  'sms.gaiamobile.org': [
    'workloads/contacts.js'
  ]
};

var systemWindow = null;

var LoadListener = {
  init: function ll_init() {
    let flags = Ci.nsIWebProgress.NOTIFY_LOCATION;
    let webProgress = docShell.QueryInterface(Ci.nsIInterfaceRequestor)
                              .getInterface(Ci.nsIWebProgress);
    webProgress.addProgressListener(this, flags);
  },

  onLocationChange: function ll_locationChange(webProgress, request, locationURI, flags) {
    this.onPageLoad(webProgress.DOMWindow);
  },

  onPageLoad: function ll_onPageLoad(currentWindow) {
    try {
      let currentDomain = currentWindow.document.location.toString();

      // Do not include frame scripts for unit test sandboxes
      if (currentWindow.wrappedJSObject.mocha &&
          currentDomain.indexOf('_sandbox.html') !== -1) {
        return;
      }

      // XXX Let's decide the main window is the one with system.* in it.
      if (currentDomain.indexOf('system.gaiamobile.org') != -1) {
        systemWindow = currentWindow;
        initSystem();
      }

      debug('loading scripts for app: ' + currentDomain);
      for (let domain in kScriptsPerDomain) {
        if (currentDomain.indexOf(domain) == -1)
          continue;

        let includes = kScriptsPerDomain[domain];
        for (let i = 0; i < includes.length; i++) {
          debug('loading ' + includes[i] + '...');

          Services.scriptloader.loadSubScript(kChromeRootPath + includes[i],
                                              currentWindow.wrappedJSObject);
        }
      }
    } catch(e) {
      debug(e);
    }
  },

  QueryInterface: function ll_QueryInterface(iid) {
    if (iid.equals(Ci.nsIWebProgressListener) ||
        iid.equals(Ci.nsISupportsWeakReference) ||
        iid.equals(Ci.nsISupports)) {
        return this;
    }
    throw Cr.NS_ERROR_NO_INTERFACE;
  }
};

LoadListener.init();



// Listen for app.launch calls and forward them to the content script
// that knows who is the system app.
// XXX This code should not be loaded in b2g-desktop to not change it's
// behavior.
Cu.import('resource://gre/modules/Webapps.jsm');
Cu.import('resource://gre/modules/AppsUtils.jsm');
Cu.import('resource://gre/modules/ObjectWrapper.jsm');
DOMApplicationRegistry.allAppsLaunchable = true;

function getContentWindow() {
  return systemWindow;
}

function sendChromeEvent(details) {
  let content = getContentWindow();
  details = details || {};

  let event = content.document.createEvent('CustomEvent');
  event.initCustomEvent('mozChromeEvent', true, true,
                        ObjectWrapper.wrap(details, content));
  content.dispatchEvent(event);
}

Services.obs.addObserver(function onLaunch(subject, topic, data) {
  let json = JSON.parse(data);
  DOMApplicationRegistry.getManifestFor(json.origin, function(aManifest) {
    if (!aManifest)
      return;

    let manifest = new ManifestHelper(aManifest, json.origin);
    let data = {
      'type': 'webapps-launch',
      'timestamp': json.timestamp,
      'url': manifest.fullLaunchPath(json.startPoint),
      'manifestURL': json.manifestURL
    };
    sendChromeEvent(data);
  });
}, 'webapps-launch', false);


// Listen for system messages and relay them to Gaia.
// XXX This code should be loaded in the activities/ extension so it won't
// affect b2g-desktop.
Services.obs.addObserver(function onSystemMessage(subject, topic, data) {
  let msg = JSON.parse(data);

  let origin = Services.io.newURI(msg.manifest, null, null).prePath;
  sendChromeEvent({
    type: 'open-app',
    url: msg.uri,
    manifestURL: msg.manifest,
    isActivity: (msg.type == 'activity'),
    target: msg.target,
    expectingSystemMessage: true
  });
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



// =================== Languages ====================
function initSystem() {
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
}
