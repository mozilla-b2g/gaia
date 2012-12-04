/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

 var GaiaDataLayer = {

  insertContact: function(cdata) {
    contact = new mozContact();
    contact.init(cdata);
    var request = window.navigator.mozContacts.save(contact);

    request.onerror = function onerror() {
      console.log('Error saving contact', request.error.name);
    }

    request.onsuccess = function onsuccess() {
      console.log('Success saving contact', request);
    }
    return request;
  },

  findAndRemoveContact: function(cdata) {
    var options = {
      filterBy: ['familyName'],
      filterOp: 'contains',
      filterValue: cdata['familyName']
    };

    contact = window.navigator.mozContacts.find(options);

    contact.onerror = function onerror() {
      console.log('Could not find contact', contact.error.name);
    }

    contact.onsuccess = function onsuccess() {
      console.log('Success finding contact', contact);
      if (contact.result.length > 0) {
        return window.navigator.mozContacts.remove(contact.result[0]);
      }
    }
  },

  getSetting: function(aName) {
    req = window.navigator.mozSettings.createLock().get(aName);
    req.onsuccess = function() {
      console.log('setting retrieved');
      marionetteScriptFinished(req.result[aName]);
    };
    req.onerror = function() {
      console.log('error getting setting', req.error.name);
    }
  },

  setSetting: function(aName, aValue, aReturnOnSuccess) {
    var returnOnSuccess = aReturnOnSuccess || aReturnOnSuccess === undefined;
    var setting = {};
    setting[aName] = aValue;
    console.log('setting ' + aName + ' to ' + aValue);
    req = window.navigator.mozSettings.createLock().set(setting);
    req.onsuccess = function() {
      console.log('setting changed');
      if (returnOnSuccess) {
        marionetteScriptFinished(true);
      }
    };
    req.onerror = function() {
      console.log('error changing setting', req.error.name);
      marionetteScriptFinished(false);
    }
  },

  connectToWiFi: function(aNetwork) {
    var manager = window.navigator.mozWifiManager;

    if (this.isWiFiConnected(aNetwork)) {
      console.log('already connected to network');
      marionetteScriptFinished(true);
    }
    else {
      var req = manager.associate(aNetwork);

      req.onsuccess = function() {
        manager.onstatuschange = function(event) {
          console.log('status: ' + manager.connection.status);
          if (manager.connection.status === 'connected') {
            manager.onstatuschange = null;
            marionetteScriptFinished(true);
          }
        }
      };

      req.onerror = function() {
        console.log('error connecting to network', req.error.name);
        marionetteScriptFinished(false);
      }
    }
  },

  disableWiFi: function() {
    var manager = window.navigator.mozWifiManager;
    if (manager.enabled) {
      manager.ondisabled = function() {
        manager.ondisabled = null;
        console.log('wifi disabled');
        marionetteScriptFinished(true);
      };
      this.setSetting('wifi.enabled', false, false);
    }
    else {
      console.log('wifi already disabled');
      marionetteScriptFinished(true);
    }
  },

  enableWiFi: function() {
    var manager = window.navigator.mozWifiManager;
    if (!manager.enabled) {
      manager.onenabled = function() {
        manager.onenabled = null;
        console.log('wifi enabled');
        marionetteScriptFinished(true);
      };
      this.setSetting('wifi.enabled', true, false);
    }
    else {
      console.log('wifi already enabled');
      marionetteScriptFinished(true);
    }
  },

  forgetWiFi: function(aNetwork) {
    var manager = window.navigator.mozWifiManager;
    var req = manager.forget(aNetwork);

    req.onsuccess = function() {
      console.log('success forgetting network');
      manager.onstatuschange = function(event) {
        console.log('status: ' + manager.connection.status);
        if (manager.connection.status === 'disconnected') {
          manager.onstatuschange = null;
          marionetteScriptFinished(true);
        }
      };
    };

    req.onerror = function() {
      console.log('error forgetting network', req.error.name);
      marionetteScriptFinished(false);
    }
  },

  isWiFiConnected: function(aNetwork) {
    var manager = window.navigator.mozWifiManager;
    return manager.connection.status === 'connected' &&
    manager.connection.network.ssid === aNetwork.ssid;
  },

  getMozTelephonyState: function() {
    return window.navigator.mozTelephony.active.state;
  }
};
