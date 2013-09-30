'use strict';

const CC = Components.Constructor;
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cm = Components.manager.QueryInterface(Ci.nsIComponentRegistrar);

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');

// Register about:gaia page
let classID = Components.ID('{58d667ee-f9e8-4545-841c-927d86906620}');

function AboutGaia() {}
AboutGaia.prototype = {
  classID: classID,
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIAboutModule]),

  getURIFlags: function(aURI) {
    return Ci.nsIAboutModule.ALLOW_SCRIPT;
  },

  newChannel: function(aURI) {
    let uri = 'chrome://gaia-build/content/aboutGaia.html';
    let channel = Services.io.newChannel(uri, null, null);
    channel.originalURI = aURI;
    return channel;
  }
};

function registerAbout() {
  let contract = '@mozilla.org/network/protocol/about;1?what=gaia';
  let instance = null;
  let newFactory = {
    createInstance: function(outer, iid) {
      if (outer)
       throw Components.results.NS_ERROR_NO_AGGREGATION;
      if (instance === null)
        instance = new AboutGaia();
      return instance;
    },
    lockFactory: function(aLock) {
       throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    },
    QueryInterface: XPCOMUtils.generateQI([Ci.nsIFactory])
  };
  Cm.registerFactory(classID, '', contract, newFactory);
}

function startup(data, reason) {
  try {
    registerAbout();
  } catch (e) {
    Cu.reportError(e + '\n' + e.stack);
  }
}

function shutdown(data, reason) {
}

function install(data, reason) {
}

function uninstall(data, reason) {
}

