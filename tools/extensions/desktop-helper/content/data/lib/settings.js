!function() {

  // Todo: consider reading from settings JSON
  var defaultSettings = {
    'ftu.manifestURL': 'http://communications.gaiamobile.org:8080/manifest.webapp',
    'homescreen.manifestURL': 'http://homescreen.gaiamobile.org:8080/manifest.webapp',
    'lockscreen.unlock-sound.enabled': false,
     'mail.sent-sound.enabled': true,
     'message.sent-sound.enabled': true,
     'phone.ring.keypad': true,
     'keyboard.layouts.english': true,
     'keyboard.layouts.dvorak': false,
     'keyboard.layouts.otherlatins': false,
     'keyboard.layouts.cyrillic': false,
     'keyboard.layouts.arabic': false,
     'keyboard.layouts.hebrew': false,
     'keyboard.layouts.zhuyin': false,
     'keyboard.layouts.pinyin': false,
     'keyboard.layouts.greek': false,
     'keyboard.layouts.japanese': false,
     'keyboard.layouts.portuguese': false,
     'keyboard.layouts.spanish': false,
     'keyboard.vibration': false,
     'keyboard.clicksound': false,
     'keyboard.wordsuggestion': false,
     'keyboard.current': 'en',
     'language.current': 'en-US'
  };

  function MockSettingsRequest() {

  }

  MockSettingsRequest.prototype = {
    addEventListener: function(type, callback) {
      console.log('Adding event listener for:', type, callback);
      if (type == 'success') {
        this.onsuccess = callback;
      }
    }
  };

  function MockSettingsLock() {

  }

  MockSettingsLock.prototype = {
    get: function(prop) {
      console.log('Settings.lock.get', prop);

      var mockSettingsRequest = new MockSettingsRequest(prop);

      window.setTimeout(function() {
        console.log('Checking for :', prop, defaultSettings[prop], mockSettingsRequest.onsuccess);

        // Disable FTU popup for now
        if (prop == 'ftu.manifestURL') {
          mockSettingsRequest.onerror();
          return;
        }

        if (mockSettingsRequest.onsuccess) {
          mockSettingsRequest.result = defaultSettings;

          mockSettingsRequest.onsuccess();
        }
      });

      return mockSettingsRequest;
    },
    set: function(obj) {
      for (var i in obj) {
        console.log('MockSettingsLock.set:', i, obj[i]);
      }
    }
  };

  FFOS_RUNTIME.makeNavigatorShim('mozSettings', {
    addObserver: function(setting, cb) {
      console.log('adding observer!', setting);
    },
    createLock: function() {
      console.log('creating lock!', arguments);
      return new MockSettingsLock();
    }
  }, true);
}();
