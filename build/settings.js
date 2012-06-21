/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

const DEBUG = false;
function debug(msg) {
  if (DEBUG)
    dump("-*- Populate SettingsDB: " + msg + "\n");
}

dump("Populate settingsdb in:" + PROFILE_DIR + "\n");

// Todo: Get a list of settings
var settings = [
 new Setting("accessibility.invert", false),
 new Setting("debug.grid.enabled", false),
 new Setting("debug.fps.enabled", false),
 new Setting("debug.paint-flashing.enabled", false),
 new Setting("homescreen.ring", 'classic.wav'),
 new Setting("keyboard.layouts.english", true),
 new Setting("keyboard.layouts.dvorak", false),
 new Setting("keyboard.layouts.otherlatins", false),
 new Setting("keyboard.layouts.cyrillic", false),
 new Setting("keyboard.layouts.arabic", false),
 new Setting("keyboard.layouts.hebrew", false),
 new Setting("keyboard.layouts.zhuyin", false),
 new Setting("keyboard.layouts.pinyin", false),
 new Setting("keyboard.layouts.greek", false),
 new Setting("keyboard.vibration", false),
 new Setting("keyboard.clicksound", false),
 new Setting("language.current", "en-US"),
 new Setting("lockscreen.passcode-lock.enabled", false),
 new Setting("lockscreen.enabled", false),
 new Setting("phone.ring.incoming", true),
 new Setting("phone.vibration.incoming", false),
 new Setting("ril.data.enabled", true),
 new Setting("ril.radio.disabled", false),
 new Setting("screen.automatic-brightness", true),
 new Setting("screen.brightness", 0.5),
 new Setting("sms.ring.received", true),
 new Setting("sms.vibration.received", true),
 new Setting("ums.enabled", false),
];

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
