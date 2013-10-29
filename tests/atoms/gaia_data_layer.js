/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

var GaiaDataLayer = {

  insertContact: function(aContact) {
    SpecialPowers.addPermission('contacts-create', true, document);
    contact = new mozContact(aContact);
    var req = window.navigator.mozContacts.save(contact);
    req.onsuccess = function() {
      console.log('success saving contact');
      SpecialPowers.removePermission('contacts-create', document);
      marionetteScriptFinished(true);
    };
    req.onerror = function() {
      console.error('error saving contact', req.error.name);
      SpecialPowers.removePermission('contacts-create', document);
      marionetteScriptFinished(false);
    };
  },

  getAllContacts: function(aCallback) {
    var callback = aCallback || marionetteScriptFinished;
    SpecialPowers.addPermission('contacts-read', true, document);
    var req = window.navigator.mozContacts.find({});
    req.onsuccess = function() {
      console.log('success finding contacts');
      SpecialPowers.removePermission('contacts-read', document);
      callback(req.result);
    };
    req.onerror = function() {
      console.error('error finding contacts', req.error.name);
      SpecialPowers.removePermission('contacts-read', document);
      callback(false);
    };
  },

  removeAllContacts: function() {
    var self = this;
    this.getAllContacts(function(aContacts) {
      if (aContacts.length > 0) {
        var contactsLength = aContacts.length;
        var done = 0;
        for (var i = 0; i < contactsLength; i++) {
          self.removeContact(aContacts[i], function() {
            if (++done === contactsLength) {
              marionetteScriptFinished(true);
            }
          });
        }
      }
      else {
        console.log('no contacts to remove');
          marionetteScriptFinished(true);
      }
    });
  },

  removeContact: function(aContact, aCallback) {
    var callback = aCallback || marionetteScriptFinished;
    SpecialPowers.addPermission('contacts-write', true, document);
    console.log("removing contact with id '" + aContact.id + "'");
    var req = window.navigator.mozContacts.remove(aContact);
    req.onsuccess = function() {
      console.log("success removing contact with id '" + aContact.id + "'");
      SpecialPowers.removePermission('contacts-write', document);
      callback(true);
    };
    req.onerror = function() {
      console.error("error removing contact with id '" + aContacts[i].id + "'");
      SpecialPowers.removePermission('contacts-write', document);
      callback(false);
    };
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
    };
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
    };
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
      };
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
    };
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
    };
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

    // XXX: check bug-926169
    // this is used to keep all tests passing while introducing multi-sim APIs
    var manager = window.navigator.mozMobileConnection ||
      window.navigator.mozMobileConnections &&
        window.navigator.mozMobileConnections[0];

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

    // XXX: check bug-926169
    // this is used to keep all tests passing while introducing multi-sim APIs
    var manager = window.navigator.mozMobileConnection ||
      window.navigator.mozMobileConnections &&
        window.navigator.mozMobileConnections[0];

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
  },

  deleteAllAlarms: function() {
    window.wrappedJSObject.AlarmManager.getAlarmList(function(aList) {
      aList.forEach(function(aAlarm) {
         console.log("Deleting alarm with id  '" + aAlarm.id + "'");
         window.wrappedJSObject.AlarmManager.delete(aAlarm);
      });
    });
  }
};
