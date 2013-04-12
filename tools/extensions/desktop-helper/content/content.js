
dump('======== desktop-helper: content.js loaded ========\n')

function debug(str) {
  dump('desktop-helper (frame-script): ' + str + '\n');
}

const CC = Components.Constructor;
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cr = Components.results;

Cu.import('resource://gre/modules/Services.jsm');

const kChromeRootPath = 'chrome://desktop-helper.js/content/data/';

// XXX Scripts should be loaded based on the permissions of the apps not
// based on the domain.
const kScriptsPerDomain = {
  '.gaiamobile.org': [
    'ffos_runtime.js',
    'lib/activity.js',
    'lib/bluetooth.js',
    'lib/cameras.js',
    'lib/keyboard.js',
    'lib/mobile_connection.js',
    'lib/set_message_handler.js',
    'lib/wifi.js'
  ],

  // App specific includes
  'communications.gaiamobile.org': [
    'workloads/contacts.js'
  ],

  'sms.gaiamobile.org': [
    'workloads/contacts.js'
  ],

  'calendar.gaiamobile.org': [
    'lib/alarm.js'
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

      // XXX Let's decide the main window is the one with system.* in it.
      if (currentDomain.indexOf('system.gaiamobile.org') != -1) {
        systemWindow = currentWindow;
        systemWindow.wrappedJSObject.sessionStorage.setItem('webapps-registry-ready', true);
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

