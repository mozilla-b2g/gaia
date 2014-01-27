/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

var GaiaDataLayer = {

  pairBluetoothDevice: function(aDeviceName) {
    var req = window.navigator.mozBluetooth.getDefaultAdapter();
    req.onsuccess = function() {
      var adapter = req.result;
      adapter.ondevicefound = function(aEvent) {
        device = aEvent.device;
        if (device.name === aDeviceName) {
          var pair = adapter.pair(device.address);
          marionetteScriptFinished(true);
        }
      };
      var discovery = adapter.startDiscovery();
    };
  },

  unpairAllBluetoothDevices: function() {
    var req_get_adapter = window.navigator.mozBluetooth.getDefaultAdapter();
    req_get_adapter.onsuccess = function() {
      adapter = req_get_adapter.result;
      var req = adapter.getPairedDevices();
      req.onsuccess = function() {
        var total = req.result.slice().length;
        for (var i = total; i > 0; i--) {
          var up = adapter.unpair(req.result.slice()[i - 1].address);
        }
      };
    };
    marionetteScriptFinished(true);
  },

  disableBluetooth: function() {
    var bluetooth = window.navigator.mozBluetooth;
    if (bluetooth.enabled) {
      console.log('trying to disable bluetooth');
      this.setSetting('bluetooth.enabled', false, false);
      waitFor(
        function() {
          marionetteScriptFinished(true);
        },
        function() {
          console.log('bluetooth enable status: ' + bluetooth.enabled);
          return bluetooth.enabled === false;
        }
      );
    }
    else {
      console.log('bluetooth already disabled');
      marionetteScriptFinished(true);
    }
  },

  enableBluetooth: function() {
    var bluetooth = window.navigator.mozBluetooth;
    if (!bluetooth.enabled) {
      console.log('trying to enable bluetooth');
      this.setSetting('bluetooth.enabled', true, false);
      waitFor(
        function() {
          marionetteScriptFinished(true);
        },
        function() {
          console.log('bluetooth enable status: ' + bluetooth.enabled);
          return bluetooth.enabled === true;
        }
      );
    }
    else {
      console.log('bluetooth already enabled');
      marionetteScriptFinished(true);
    }
  },

  insertContact: function(aContact) {
    SpecialPowers.addPermission('contacts-create', true, document);
    var contact = new mozContact(aContact);
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
      callback([]);
    };
  },

  getSIMContacts: function(aCallback) {
    var callback = aCallback || marionetteScriptFinished;
    var icc = navigator.mozIccManager;

    // See bug 932134
    // To keep all tests passed while introducing multi-sim APIs, in bug 928325
    // we do the following check. Remove it after the APIs land.
    if (icc && icc.iccIds && icc.iccIds[0]) {
      icc = icc.getIccById(icc.iccIds[0]);
    }
    var req = icc.readContacts('adn');
    req.onsuccess = function() {
      console.log('success finding contacts');
      SpecialPowers.removePermission('contacts-read', document);
      callback(req.result);
    };
    req.onerror = function() {
      console.error('error finding contacts', req.error.name);
      SpecialPowers.removePermission('contacts-read', document);
      callback([]);
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

  getSetting: function(aName, aCallback) {
    var callback = aCallback || marionetteScriptFinished;
    SpecialPowers.addPermission('settings-read', true, document);
    var req = window.navigator.mozSettings.createLock().get(aName);
    req.onsuccess = function() {
      console.log('setting retrieved');
      let result = aName === '*' ? req.result : req.result[aName];
      callback(result);
    };
    req.onerror = function() {
      console.log('error getting setting', req.error.name);
    };
  },

  setSetting: function(aName, aValue, aReturnOnSuccess) {
    SpecialPowers.addPermission('settings-readwrite', true, document);
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

  connectToCellData: function() {

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
      console.log('cell data already connected');
      marionetteScriptFinished(true);
    }
  },

  disableCellData: function() {
    var self = this;
    this.getSetting('ril.data.enabled', function(aCellDataEnabled) {

      // XXX: check bug-926169
      // this is used to keep all tests passing while introducing multi-sim APIs
      var manager = window.navigator.mozMobileConnection ||
        window.navigator.mozMobileConnections &&
          window.navigator.mozMobileConnections[0];

      if (aCellDataEnabled) {
        waitFor(
          function() {
            console.log('cell data disabled');
            marionetteScriptFinished(true);
          },
          function() { return !manager.data.connected; }
        );
        self.setSetting('ril.data.enabled', false, false);
      }
      else {
        console.log('cell data already disabled');
        marionetteScriptFinished(true);
      }
    });
  },

  getAllPictures: function() {
    this.getFiles('pictures');
  },

  getAllVideos: function() {
    this.getFiles('videos');
  },

  getAllMusic: function() {
    this.getFiles('music');
  },

  getAllSDCardFiles: function() {
    this.getFiles('sdcard');
  },

  getFiles: function(aType, aCallback) {
    var callback = aCallback || marionetteScriptFinished;
    var files = [];
    console.log('getting', aType);
    var storage = navigator.getDeviceStorage(aType);
    var req = storage.enumerate();
    req.onsuccess = function() {
      var file = req.result;
      if (file) {
        if (aType === 'music' &&
            file.name.slice(0, 13) === '/sdcard/DCIM/' &&
            file.name.slice(-4) === '.3gp') {
          req.continue();
        }
        else {
          // File.name returns a fully qualified path
          files.push(file.name);
          req.continue();
        }
      }
      else {
        callback(files);
      }
    };
    req.onerror = function() {
      console.error('failed to enumerate ' + aType, req.error.name);
      callback(false);
    };
  },

  sendSMS: function(recipient, content, aCallback) {
    var callback = aCallback || marionetteScriptFinished;
    console.log('sending sms message to number: ' + recipient);

    SpecialPowers.addPermission('sms', true, document);
    SpecialPowers.setBoolPref('dom.sms.enabled', true);
    let sms = window.navigator.mozMobileMessage;

    let request = sms.send(recipient, content);

    request.onsuccess = function() {
      console.log('sms message sent successfully');
      SpecialPowers.removePermission('sms', document);
      SpecialPowers.clearUserPref('dom.sms.enabled');
      callback(true);
    };

    request.onerror = function() {
      console.log('sms message not sent');
      SpecialPowers.removePermission('sms', document);
      SpecialPowers.clearUserPref('dom.sms.enabled');
      callback(false);
    };
  },

  deleteAllSms: function(aCallback) {
    var callback = aCallback || marionetteScriptFinished;
    console.log('searching for sms messages');

    SpecialPowers.addPermission('sms', true, document);
    SpecialPowers.setBoolPref('dom.sms.enabled', true);
    let sms = window.navigator.mozMobileMessage;

    let msgList = new Array();
    let filter = new MozSmsFilter;
    let request = sms.getMessages(filter, false);

    request.onsuccess = function(event) {
      var cursor = event.target.result;
      // Check if message was found
      if (cursor && cursor.message) {
        msgList.push(cursor.message.id);
        // Now get next message in the list
        cursor.continue();
      } else {
        // No (more) messages found
        if (msgList.length) {
          console.log('found ' + msgList.length + ' sms messages to delete');
          deleteSmsMsgs(msgList);
        } else {
          console.log('zero sms messages found');
          disableSms();
          callback(true);
        }
      }
    };

    request.onerror = function(event) {
      console.log('sms.getMessages error: ' + event.target.error.name);
      disableSms();
      callback(false);
    };

    function deleteSmsMsgs(msgList) {
      let smsId = msgList.shift();
      console.log('deleting sms id: ' + smsId);
      let request = sms.delete(smsId);

      request.onsuccess = function(event) {
        if (event.target.result) {
          // Message deleted, continue until none are left
          if (msgList.length) {
            deleteSmsMsgs(msgList);
          } else {
            // All messages deleted
            console.log('finished deleting all sms messages');
            disableSms();
            callback(true);
          }
        } else {
          console.log('sms delete failed');
          disableSms();
          callback(false);
        }
      };

      request.onerror = function(event) {
        console.log('sms.delete request returned unexpected error: ' +
                    event.target.error.name);
        disableSms();
        callback(false);
      };
    }

    function disableSms() {
      SpecialPowers.removePermission('sms', document);
      SpecialPowers.clearUserPref('dom.sms.enabled');
    }
  },

  bluetoothSetDeviceName: function(device_name, aCallback) {
    var callback = aCallback || marionetteScriptFinished;
    console.log("Setting device's bluetooth name to '%s'" % device_name);

    var req = window.navigator.mozBluetooth.getDefaultAdapter();
    req.onsuccess = function() {
      var adapter = req.result;
      var req_set_name = adapter.setName(device_name);
      req_set_name.onsuccess = function() {
        callback(true);
      };
      req_set_name.onerror = function(event) {
        console.log('setName returned unexpected error: ' +
                    event.target.error.name);
        callback(false);
      };
    };
    req.onerror = function(event) {
      console.log('getDefaultAdapter returned unexpected error: ' +
                  event.target.error.name);
      callback(false);
    };
  },

  bluetoothSetDeviceDiscoverableMode: function(discoverable, aCallback) {
    var callback = aCallback || marionetteScriptFinished;
    if (discoverable == true) {
      console.log('Making the device discoverable via bluetooth');
    } else {
      console.log('Turning device bluetooth discoverable mode OFF');
    }

    var req = window.navigator.mozBluetooth.getDefaultAdapter();
    req.onsuccess = function() {
      var adapter = req.result;
      var req_discoverable = adapter.setDiscoverable(discoverable);
      req_discoverable.onsuccess = function() {
        callback(true);
      };
      req_discoverable.onerror = function(event) {
        console.log('setDiscoverable returned unexpected error: ' +
                    event.target.error.name);
        callback(false);
      };
    };
    req.onerror = function(event) {
      console.log('getDefaultAdapter returned unexpected error: ' +
                  event.target.error.name);
      callback(false);
    };
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
