/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

let DEBUG = 1;
if (DEBUG) {
  debug = function (s) { dump("-*- Populate SettingsDB: " + s + "\n"); }
} else {
  debug = function (s) {}
}

debug("Populate settingsdb in:" + PROFILE_DIR);

// Todo: Get a list of settings
var settings = [
 new Setting("debug.grid.enabled", false)
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

let callback = {};
callback.handle = function handle(name, result)
{ 
  Setting.counter--;
};

callback.handleError = function handleError(name)
{
  dump("SettingsDB Error: " + name);
  Setting.counter--;
};

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

debug("SettingsDB filled, Shutdown");