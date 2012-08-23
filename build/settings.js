/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

'use strict';

function debug(msg) {
  //dump("-*- Populate SettingsDB: " + msg + "\n");
}

dump("Populate settingsdb in:" + PROFILE_DIR + "\n");

// Todo: Get a list of settings
var settings = [
 new Setting("alarm.enabled", false),
 new Setting("accessibility.invert", false),
 new Setting("accessibility.screenreader", false),
 new Setting("audio.volume.master", 0.5),
 new Setting("bluetooth.enabled", false),
 new Setting("costcontrol.credit.currency", "R$"),
 new Setting("costcontrol.balance.destination", "8000"),
 new Setting("costcontrol.balance.text", "SALDO"),
 new Setting("costcontrol.balance.senders", "[\"1515\"]"),
 new Setting("costcontrol.balance.regexp", "R\\$\\s*([0-9]+)(?:[,\\.]([0-9]+))?"),
 new Setting("costcontrol.topup.destination", "7000"),
 new Setting("costcontrol.topup.text", "&code"),
 new Setting("costcontrol.topup.senders", "[\"1515\",\"7000\"]"),
 new Setting("costcontrol.topup.confirmation_regexp", "Voce recarregou R\\$\\s*([0-9]+)(?:[,\\.]([0-9]+))?"),
 new Setting("costcontrol.topup.incorrect_code_regexp", "(Favor enviar|envie novamente|Verifique) o codigo de recarga"),
 new Setting("debug.grid.enabled", false),
 new Setting("debug.fps.enabled", false),
 new Setting("debug.log-animations.enabled", false),
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
 new Setting("ril.data.httpProxyHost", ""),
 new Setting("ril.data.httpProxyPort", 0),
 new Setting("ril.data.mmsc", ""),
 new Setting("ril.data.mmsproxy", ""),
 new Setting("ril.data.mmsport", 0),
 new Setting("ril.data.roaming_enabled", false),
 new Setting("ril.data.user", ""),
 new Setting("ril.radio.disabled", false),
 new Setting("screen.automatic-brightness", true),
 new Setting("screen.brightness", 1),
 new Setting("sms.ring.received", true),
 new Setting("sms.vibration.received", true),
 new Setting("sms.blacklist", "[\"1515\"]"),
 new Setting("tethering.usb.enabled", false),
 new Setting("tethering.wifi.enabled", false),
 new Setting("tethering.wifi.connectedClients", 0),
 new Setting("tethering.usb.connectedClients", 0),
 new Setting("ums.enabled", false),
 new Setting("ums.mode", 0),
 new Setting("wifi.enabled", true),
 new Setting("wifi.notification", false)
];

// Disable the screen timeout in DEBUG mode
settings.push(new Setting("screen.timeout", DEBUG ? 0 : 60));

// Sanity check: Ensure there is no duplicate
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


(function writeSettingsToDatabase() {
  let callback = {
    handle : function handle(name, result) {
      Setting.counter--;
    },

    handleError : function handleError(name) {
      dump("SettingsDB Error: " + name);
      Setting.counter--;
    }
  }

  let settingsDBService = Cc["@mozilla.org/settingsService;1"]
                            .getService(Ci.nsISettingsService);
  let lock = settingsDBService.getLock();

  for (let i in settings) {
    debug("add seting: " + settings[i].name + ", " + settings[i].value);
    lock.set(settings[i].name, settings[i].value, callback);
  }

  if (Gaia.engine === "xpcshell") {
    var thread = Cc["@mozilla.org/thread-manager;1"]
                   .getService(Ci.nsIThreadManager)
                   .currentThread;

    while ((Setting.counter > 0) || thread.hasPendingEvents()) {
      thread.processNextEvent(true);
    }
  }
})();

dump("SettingsDB filled.\n");
