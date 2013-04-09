
dump("======== desktop-helper: content.js loaded ========\n")

function debug(str) {
  dump("desktop-helper (frame-script): " + str + "\n");
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
    'hardware.js',
    'lib/activity.js',
    'lib/apps.js',
    'lib/bluetooth.js',
    'lib/cameras.js',
    'lib/getdevicestorage.js',
    'lib/idle.js',
    'lib/keyboard.js',
    'lib/mobile_connection.js',
    'lib/power.js',
    'lib/set_message_handler.js',
    'lib/settings.js',
    'lib/wifi.js'
  ],

  // App specific includes
  '.communications.gaiamobile.org': [
    'workloads/contacts.js'
  ],

  '.sms.gaiamobile.org': [
    'workloads/contacts.js'
  ],

  '.fm.gaiamobile.org': [
    'apps/fm.js'
  ],

  '.homescreen.gaiamobile.org' :[
    'apps/homescreen.js'
  ],

  '.calendar.gaiamobile.org': [
    'lib/alarm.js'
  ]
};


var LoadListener = {
  init: function ll_init() {
    let flags = Ci.nsIWebProgress.NOTIFY_LOCATION |
                Ci.nsIWebProgress.NOTIFY_STATE_WINDOW |
                Ci.nsIWebProgress.NOTIFY_STATE_DOCUMENT |
                Ci.nsIWebProgress.NOTIFY_STATE_ALL;
    let webProgress = docShell.QueryInterface(Ci.nsIInterfaceRequestor)
                              .getInterface(Ci.nsIWebProgress);
    webProgress.addProgressListener(this, flags);
  },

  onStateChange: function ll_onStateChange(webProgress, request, stateFlags, status) {
    this.onPageLoad(webProgress.DOMWindow);
  },

  onLocationChange: function ll_locationChange(webProgress, request, locationURI, flags) {
    this.onPageLoad(webProgress.DOMWindow);
  },

  onPageLoad: function ll_onPageLoad(currentWindow) {
    // XXX Right now the progress listener is really agressive and try to inject
    // mocks/content/whatever on way too many operations.
    if (currentWindow.alreadyMocked)
      return;
    currentWindow.alreadyMocked = true;

    try {
      let currentDomain = currentWindow.location.toString();
      if (currentDomain == 'about:blank')
        return;

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

