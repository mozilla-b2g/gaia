/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

const SETTINGS_DEBUG = false;
function debug(msg) {
  if (SETTINGS_DEBUG)
    dump("-*- Populate SettingsDB: " + msg + "\n");
}

dump("Populate settingsdb in:" + PROFILE_DIR + "\n");

// Todo: Get a list of settings
var settings = [
 new Setting("alarm.enabled", false),
 new Setting("accessibility.invert", false),
 new Setting("bluetooth.enabled", false),
 new Setting("debug.grid.enabled", false),
 new Setting("debug.fps.enabled", false),
 new Setting("debug.paint-flashing.enabled", false),
 new Setting("devtools.debugger.force-local", true),
 new Setting("devtools.debugger.log", false),
 new Setting("devtools.debugger.remote-enabled", false),
 new Setting("devtools.debugger.remote-port", 6000),
 new Setting("geolocation.enabled", true),
 new Setting("homescreen.ring", 'classic.wav'),
 new Setting("homescreen.wallpaper", "default.png"),
 new Setting("keyboard.layouts.english", true),
 new Setting("keyboard.layouts.dvorak", false),
 new Setting("keyboard.layouts.otherlatins", false),
 new Setting("keyboard.layouts.cyrillic", false),
 new Setting("keyboard.layouts.arabic", false),
 new Setting("keyboard.layouts.hebrew", false),
 new Setting("keyboard.layouts.zhuyin", false),
 new Setting("keyboard.layouts.pinyin", false),
 new Setting("keyboard.layouts.greek", false),
 new Setting("keyboard.layouts.japanese", false),
 new Setting("keyboard.layouts.portuguese", false),
 new Setting("keyboard.layouts.spanish", false),
 new Setting("keyboard.vibration", false),
 new Setting("keyboard.clicksound", false),
 new Setting("keyboard.wordsuggestion", false),
 new Setting("language.current", "en-US"),
 new Setting("lockscreen.passcode-lock.code", "0000"),
 new Setting("lockscreen.passcode-lock.enabled", false),
 new Setting("lockscreen.enabled", true),
 new Setting("lockscreen.locked", true),
 new Setting("lockscreen.wallpaper", "balloon.png"),
 new Setting("phone.ring.incoming", true),
 new Setting("phone.ring.keypad", true),
 new Setting("phone.vibration.incoming", true),
 new Setting("ril.data.enabled", false),
 new Setting("ril.data.apn", ""),
 new Setting("ril.data.passwd", ""),
 new Setting("ril.data.mmsc", ""),
 new Setting("ril.data.mmsproxy", ""),
 new Setting("ril.data.mmsport", 0),
 new Setting("ril.data.roaming.enabled", false),
 new Setting("ril.data.user", ""),
 new Setting("ril.radio.disabled", false),
 new Setting("screen.automatic-brightness", true),
 new Setting("screen.brightness", 1),
 new Setting("screen.timeout", 60),
 new Setting("sms.ring.received", true),
 new Setting("sms.vibration.received", true),
 new Setting("tethering.usb.enabled", false),
 new Setting("tethering.wifi.enabled", false),
 new Setting("tethering.wifi.connectedClients", 0),
 new Setting("tethering.usb.connectedClients", 0),
 new Setting("ums.enabled", false),
 new Setting("ums.mode", ""),
 new Setting("wifi.enabled", true),
 new Setting("wifi.notification", false)
];

// Ensure there is no duplicate
for (let i in settings) {
  var settingName = settings[i].name;
  for (let j in settings) {
    if (i === j)
      continue;

    if (settingName === settings[j].name) {
      throw new Error('There is a at least 2 settings called: ' + settingName);
    }
  }
}

function Setting(aName, aValue) {
  this.name = aName;
  this.value = aValue;
  if (typeof Setting.counter == 'undefined') {
    Setting.counter = 0;
  }

  Setting.counter++;
}

const { 'classes': Cc, 'interfaces': Ci, 'results': Cr, 'utils' : Cu } = Components;

(function registerProfileDirectory() {

  let directoryProvider = {
    getFile: function provider_getFile(prop, persistent) {
      persistent.value = true;
      debug("prop: " + prop);
      if (prop != "ProfD" && prop != "ProfLDS") {
        throw Cr.NS_ERROR_FAILURE;
      }

      let file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile)
      file.initWithPath(PROFILE_DIR);
      return file;
    },

    QueryInterface: function provider_queryInterface(iid) {
      if (iid.equals(Ci.nsIDirectoryServiceProvider) ||
          iid.equals(Ci.nsISupports)) {
        return this;
      }
      throw Cr.NS_ERROR_NO_INTERFACE;
    }
  };

  Cc["@mozilla.org/file/directory_service;1"]
    .getService(Ci.nsIProperties)
    .QueryInterface(Ci.nsIDirectoryService)
    .registerProvider(directoryProvider);
})();

let settingsDBService = Cc["@mozilla.org/settingsService;1"].getService(Ci.nsISettingsService);

let callback = {
  handle : function handle(name, result)
  {
    Setting.counter--;
  },

  handleError : function handleError(name)
  {
    dump("SettingsDB Error: " + name);
    Setting.counter--;
  }
}

let lock = settingsDBService.getLock();

for (let i in settings) {
  debug("add seting: " + settings[i].name + ", " + settings[i].value);
  lock.set(settings[i].name, settings[i].value, callback);
}

var thread = Components.classes["@mozilla.org/thread-manager;1"]
                       .getService(Components.interfaces.nsIThreadManager)
                       .currentThread;

while ((Setting.counter > 0) || thread.hasPendingEvents()) {
  thread.processNextEvent(true);
}

dump("SettingsDB filled.\n");
