/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

var GaiaDataLayer = {

  insertContact: function(cdata) {
    contact = new mozContact();
    contact.init(cdata);
    var request = window.navigator.mozContacts.save(contact);

    request.onerror = function onerror() {
      console.log('Error saving contact', request.error.name);
    };

    request.onsuccess = function onsuccess() {
      console.log('Success saving contact', request);
    };
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
    };

    contact.onsuccess = function onsuccess() {
      console.log('Success finding contact', contact);
      if (contact.result.length > 0) {
        return window.navigator.mozContacts.remove(contact.result[0]);
      }
    }
  },

  getSetting: function(aName) {
    var req = window.navigator.mozSettings.createLock().get(aName);
    req.onsuccess = function() {
      console.log('setting retrieved');
      let result = aName === '*' ? req.result : req.result[aName];
      marionetteScriptFinished(result);
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
    var req = window.navigator.mozSettings.createLock().set(setting);
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

  connectToWiFi: function(aNetwork, aCallback) {
    var callback = aCallback || marionetteScriptFinished;
    var manager = window.navigator.mozWifiManager;

    if (this.isWiFiConnected(aNetwork)) {
      console.log("already connected to network with ssid '" +
                  aNetwork.ssid + "'");
      callback(true);
    }
    else {
      var req = manager.associate(aNetwork);

      req.onsuccess = function() {
        console.log("waiting for connection status 'connected'");
        waitFor(
          function() {
            console.log("success connecting to network with ssid '" +
                        aNetwork.ssid + "'");
            callback(true);
          },
          function() {
            console.log('connection status: ' + manager.connection.status);
            return manager.connection.status === 'connected';
          }
        );
      };

      req.onerror = function() {
        console.log('error connecting to network', req.error.name);
        callback(false);
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

  forgetAllNetworks: function(aCallback) {
    var callback = aCallback || marionetteScriptFinished;
    var self = this;
    this.getKnownNetworks(function(aNetworks) {
      if (aNetworks.length > 0) {
        var networksLength = aNetworks.length;
        var done = 0;
        for (var i = 0; i < networksLength; i++) {
          self.forgetWiFi(aNetworks[i], function() {
            if (++done === networksLength) {
              callback(true);
            }
          }, false);
        }
      }
      else {
        console.log('no known networks to forget');
        callback(true);
      }
    });
  },

  getKnownNetworks: function(aCallback) {
    var callback = aCallback || marionetteScriptFinished;
    var manager = window.navigator.mozWifiManager;
    var req = manager.getKnownNetworks();

    req.onsuccess = function() {
      console.log('success getting known networks');
      callback(req.result);
    };

    req.onerror = function() {
      console.log('error getting known networks', req.error.name);
      callback([]);
    }
  },

  forgetWiFi: function(aNetwork, aCallback, aWaitForStatus) {
    var callback = aCallback || marionetteScriptFinished;
    var waitForStatus = aWaitForStatus || 'disconnected';
    var manager = window.navigator.mozWifiManager;
    var req = manager.forget(aNetwork);

    req.onsuccess = function() {
      console.log("success forgetting network with ssid '" +
                  aNetwork.ssid + "'");
      if (waitForStatus !== false) {
        console.log("waiting for connection status '" +
                    waitForStatus + "'");
        waitFor(
          function() { callback(true); },
          function() {
            console.log('connection status: ' + manager.connection.status);
            return manager.connection.status === waitForStatus;
          }
        );
      }
      else {
        callback(true);
      }
    };

    req.onerror = function() {
      console.log("error forgetting network with ssid '" + aNetwork.ssid + "'",
                  req.error.name);
      callback(false);
    }
  },

  isWiFiConnected: function(aNetwork) {
    var manager = window.navigator.mozWifiManager;
    return manager.connection.status === 'connected' &&
           manager.connection.network.ssid === aNetwork.ssid;
  },

  getMozTelephonyState: function() {
    return window.navigator.mozTelephony.active.state;
  },

  enableCellData: function() {
    var manager = window.navigator.mozMobileConnection;

    if (!manager.data.connected) {
      waitFor(
        function() {
          console.log('cell data enabled');
          marionetteScriptFinished(true);
        },
        function() { return manager.data.connected; }
      );
      this.setSetting('ril.data.enabled', true, false);
    }
    else {
      console.log('cell data already enabled');
      marionetteScriptFinished(true);
    }
  },

  disableCellData: function() {
    var manager = window.navigator.mozMobileConnection;

    if (manager.data.connected) {
      waitFor(
        function() {
          console.log('cell data disabled');
          marionetteScriptFinished(true);
        },
        function() { return !manager.data.connected; }
      );
      this.setSetting('ril.data.enabled', false, false);
    }
    else {
      console.log('cell data already disabled');
      marionetteScriptFinished(true);
    }
  },

  getAllMediaFiles: function(aCallback) {
    var callback = aCallback || marionetteScriptFinished;
    var mediaTypes = ['pictures', 'videos', 'music'];
    var remainingMediaTypes = mediaTypes.length;
    var media = [];
    mediaTypes.forEach(function(aType) {
      console.log('getting', aType);
      var storage = navigator.getDeviceStorage(aType);
      var req = storage.enumerate();
      req.onsuccess = function() {
        var file = req.result;
        if (file) {
          if (aType === 'music' && file.name.slice(0, 5) === 'DCIM/' &&
              file.name.slice(-4) === '.3gp') {
            req.continue();
          }
          else {
            media.push(file.name);
            req.continue();
          }
        }
        else {
          remainingMediaTypes--;
        }
      };
      req.onerror = function() {
        console.error('failed to enumerate ' + aType, req.error.name);
        callback(false);
      };
    });

    waitFor(
      function() { callback(media); },
      function() { return remainingMediaTypes === 0; }
    );
  }
};
