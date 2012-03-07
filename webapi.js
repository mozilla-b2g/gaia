/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// MozApps - Bug 709015
(function(window) {
  var navigator = window.navigator;

  var webapps = [
                 { // dialer
                   'installOrigin': 'http://gaiamobile.org:8888',
                   'origin': '../dialer',
                   'receipt': null,
                   'installTime': 1323339869000,
                   manifest: {
                     'name': 'Dialer',
                     'description': 'Gaia Dialer',
                     'launch_path': '/dialer.html',
                     'developer': {
                       'name': 'The Gaia Team',
                       'url': 'https://github.com/andreasgal/gaia'
                     },
                     'icons': {
                       '120': '/style/icons/Phone.png'
                     }
                   }
                 },
                 { // sms
                   'installOrigin': 'http://gaiamobile.org:8888',
                   'origin': '../sms',
                   'receipt': null,
                   'installTime': 1323339869000,
                   manifest: {
                     'name': 'Messages',
                     'description': 'Gaia Messages',
                     'launch_path': '/sms.html',
                     'developer': {
                       'name': 'The Gaia Team',
                       'url': 'https://github.com/andreasgal/gaia'
                     },
                     'icons': {
                       '120': '/style/icons/Messages.png'
                     }
                   }
                 },
                 { // browser
                   installOrigin: 'http://gaiamobile.org:8888',
                   origin: '../browser',
                   receipt: null,
                   installTime: 1323339869000,
                   manifest: {
                     'name': 'Browser',
                     'description': 'Gaia Web Browser',
                     'launch_path': '/browser.html',
                     'developer': {
                       'name': 'The Gaia Team',
                       'url': 'https://github.com/andreasgal/gaia'
                     },
                     'icons': {
                       '120': '/style/icons/Browser.png'
                     }
                   }
                 },
                 { // maps
                   installOrigin: 'http://gaiamobile.org:8888',
                   origin: '../maps',
                   receipt: null,
                   installTime: 1323339869000,
                   manifest: {
                     'name': 'Maps',
                     'description': 'Google Maps',
                     'launch_path': '/maps.html',
                     'developer': {
                       'name': 'The Gaia Team',
                       'url': 'https://github.com/andreasgal/gaia'
                     },
                     'icons': {
                       '120': '/style/icons/Maps.png'
                     }
                   }
                 },
                 { // camera
                   'installOrigin': 'http://gaiamobile.org:8888',
                   'origin': '../camera',
                   'receipt': null,
                   'installTime': 1323339869000,
                   manifest: {
                     'name': 'Camera',
                     'description': 'Gaia Camera',
                     'launch_path': '/camera.html',
                     'hackKillMe': true,
                     'developer': {
                       'name': 'The Gaia Team',
                       'url': 'https://github.com/andreasgal/gaia'
                     },
                     'icons': {
                       '120': '/style/icons/Camera.png'
                     }
                   }
                 },
                 { // gallery
                   'installOrigin': 'http://gaiamobile.org:8888',
                   'origin': '../gallery',
                   'receipt': null,
                   'installTime': 1323339869000,
                   manifest: {
                     'name': 'Gallery',
                     'description': 'Gaia Gallery',
                     'launch_path': '/gallery.html',
                     'developer': {
                       'name': 'The Gaia Team',
                       'url': 'https://github.com/andreasgal/gaia'
                     },
                     'icons': {
                       '120': '/style/icons/Gallery.png'
                     }
                   }
                 },
                 { // video
                   'installOrigin': 'http://gaiamobile.org:8888',
                   'origin': '../video',
                   'receipt': null,
                   'installTime': 1323339869000,
                   manifest: {
                     'name': 'Video',
                     'description': 'Gaia Video',
                     'launch_path': '/video.html',
                     'hackKillMe': true,
                     'developer': {
                       'name': 'The Gaia Team',
                       'url': 'https://github.com/andreasgal/gaia'
                     },
                     'icons': {
                       '120': '/style/icons/Video.png'
                     },
                     'fullscreen': true,
                   }
                 },
                 { // facebook
                   'installOrigin': 'http://www.facebook.com',
                   'origin': 'http://touch.facebook.com',
                   'receipt': null,
                   'installTime': 1323339869000,
                   manifest: {
                     'name': 'Facebook',
                     'description': 'Facebook Mobile Application',
                     'launch_path': '/',
                     'developer': {
                       'name': 'Facebook',
                       'url': 'http://www.facebook.com/'
                     },
                     'icons': {
                       '120': '/style/icons/Facebook.png'
                     }
                   }
                 },
                 { // market
                   'installOrigin': 'http://gaiamobile.org:8888',
                   'origin': '../market',
                   'receipt': null,
                   'installTime': 1323339869000,
                   manifest: {
                     'name': 'Market',
                     'description': 'Market for downloading and installing apps',
                     'launch_path': '/market.html',
                     'developer': {
                       'name': 'The Gaia Team',
                       'url': 'https://github.com/andreasgal/gaia'
                     },
                     'icons': {
                       '120': '/style/icons/Market.png'
                     }
                   }
                 },
                 { // music
                   'installOrigin': 'http://gaiamobile.org:8888',
                   'origin': '../music',
                   'receipt': null,
                   'installTime': 1323339869000,
                   manifest: {
                     'name': 'Music',
                     'description': 'Gaia Music',
                     'launch_path': '/music.html',
                     'developer': {
                       'name': 'The Gaia Team',
                       'url': 'https://github.com/andreasgal/gaia'
                     },
                     'icons': {
                       '120': '/style/icons/Music.png'
                     }
                   }
                 },
                 { // settings
                   'installOrigin': 'http://gaiamobile.org:8888',
                   'origin': '../settings',
                   'receipt': null,
                   'installTime': 1323339869000,
                   manifest: {
                     'name': 'Settings',
                     'description': 'Gaia Settings',
                     'launch_path': '/settings.html',
                     'developer': {
                       'name': 'The Gaia Team',
                       'url': 'https://github.com/andreasgal/gaia'
                     },
                     'icons': {
                       '120': '/style/icons/Settings.png'
                     }
                   }
                 },
                 { // clock
                   installOrigin: 'http://gaiamobile.org:8888',
                   origin: '../clock',
                   receipt: null,
                   installTime: 1323339869000,
                   manifest: {
                     'name': 'Clock',
                     'description': 'Gaia Clock',
                     'launch_path': '/clock.html',
                     'developer': {
                       'name': 'The Gaia Team',
                       'url': 'https://github.com/andreasgal/gaia'
                     },
                     'icons': {
                       '120': '/style/icons/Clock.png'
                     }
                   }
                 },
                 { // webgl demo
                   'installOrigin': 'http://www.everyday3d.com/j3d/demo',
                   'origin': '../crystalskull',
                   'receipt': null,
                   'installTime': 1323339869000,
                   manifest: {
                     'name': 'Crystal Skull',
                     'description': 'Demo of WebGL',
                     'launch_path': '/crystalskull.html',
                     'hackKillMe': true,
                     'developer': {
                       'name': 'Unknown',
                       'url': 'http://www.everyday3d.com/j3d/demo/004_Glass.html'
                     },
                     'icons': {
                       '120': '/style/icons/CrystalSkull.png'
                     },
                     'fullscreen': true
                   }
                 },
                 { // video cube demo
                   'installOrigin': 'http://www.everyday3d.com/j3d/demo',
                   'origin': '../cubevid',
                   'receipt': null,
                   'installTime': 1323339869000,
                   manifest: {
                     'name': 'VideoCube',
                     'description': 'Demo of WebGL',
                     'launch_path': '/index.html',
                     'hackKillMe': true,
                     'developer': {
                       'name': 'Unknown',
                       'url': 'http://www.everyday3d.com/j3d/demo/004_Glass.html'
                     },
                     'icons': {
                       '120': '/style/icons/VideoCube.png'
                     },
                     'fullscreen': true
                   }
                 },
                 { // PenguinPop
                   'installOrigin': 'http://goosypets.com/html5games/whac',
                   'origin': '../penguinpop',
                   'receipt': null,
                   'installTime': 1323339869000,
                   manifest: {
                     'name': 'Penguin Pop',
                     'description': 'Penguin Pop by TweenSoft.com',
                     'launch_path': '/penguinpop.html',
                     'developer': {
                       'name': 'TweenSoft.com',
                       'url': 'http://goosypets.com/html5games/whac/'
                     },
                     'icons': {
                       '120': '/style/icons/PenguinPop.png'
                     }
                   }
                 },
                 { // TowerJelly
                   'installOrigin': 'http://goosypets.com/html5games/tower/',
                   'origin': '../towerjelly',
                   'receipt': null,
                   'installTime': 1323339869000,
                   manifest: {
                     'name': 'Tower Jelly',
                     'description': 'Tower Jelly by TweenSoft.com',
                     'launch_path': '/towerjelly.html',
                     'developer': {
                       'name': 'TweenSoft.com',
                       'url': 'http://goosypets.com/html5games/tower/'
                     },
                     'icons': {
                       '120': '/style/icons/TowerJelly.png'
                     }
                   }
                 },
                 { // cut the rope
                   'installOrigin': 'http://cuttherope.ie/',
                   'origin': 'http://cuttherope.ie/',
                   'receipt': null,
                   'installTime': 1323339869000,
                   manifest: {
                     'name': 'Cut The Rope',
                     'description': 'http://cuttherope.ie',
                     'launch_path': '',
                     'orientation': 'landscape-primary',
                     'fullscreen': true,
                     'hackKillMe': true,
                     'developer': {
                       'name': 'ZeptoLab',
                       'url': 'http://cuttherope.ie'
                     },
                     'icons': {
                       '120': '/style/icons/CutTheRope.png'
                     }
                   }
                 },
                 { // wikipedia
                   'installOrigin': 'http://www.wikipedia.org/',
                   'origin': '../wikipedia',
                   'receipt': null,
                   'installTime': 1323339869000,
                   manifest: {
                     'name': 'Wikipedia',
                     'description': 'Wikipedia Mobile Application',
                     'launch_path': '/wikipedia.html',
                     'developer': {
                       'name': 'Wikipedia',
                       'url': 'http://www.wikipedia.org/'
                     },
                     'icons': {
                       '120': '/style/icons/Wikipedia.png'
                     }
                   }
                 },
                 { // CNN
                   'installOrigin': 'http://m.cnn.com/',
                   'origin': '../cnn',
                   'receipt': null,
                   'installTime': 1323339869000,
                   manifest: {
                     'name': 'CNN',
                     'description': 'CNN Mobile Application',
                     'launch_path': '/cnn.html',
                     'developer': {
                       'name': 'CNN',
                       'url': 'http://www.cnn.com/'
                     },
                     'icons': {
                       '120': '/style/icons/CNN.png'
                     }
                   }
                 },
                 { // BBC
                   'installOrigin': 'http://m.bbc.co.uk/',
                   'origin': '../bbc',
                   'receipt': null,
                   'installTime': 1323339869000,
                   manifest: {
                     'name': 'BBC',
                     'description': 'BBC Mobile Application',
                     'launch_path': '/bbc.html',
                     'developer': {
                       'name': 'BBC',
                       'url': 'http://www.bbc.co.uk/'
                     },
                     'icons': {
                       '120': '/style/icons/BBC.png'
                     }
                   }
                 },
                 { // NY Times
                   'installOrigin': 'http://www.nytimes.com/',
                   'origin': '../nytimes',
                   'receipt': null,
                   'installTime': 1323339869000,
                   manifest: {
                     'name': 'NY Times',
                     'description': 'NY Times Mobile Application',
                     'launch_path': '/nytimes.html',
                     'developer': {
                       'name': 'NY Times',
                       'url': 'http://www.nytimes.com/'
                     },
                     'icons': {
                       '120': '/style/icons/NYT.png'
                     }
                   }
                 }
  ];

  Object.freeze(webapps);

  navigator.mozApps = {
    enumerate: function(callback) {
      callback(webapps);
    }
  };
})(this);


// A hacked mozSettings implementation based on indexedDB instead
// of localStorage to make it persist better in the face of unexpected
// shutdowns and reboots
(function() {
  var DEFAULTS = {
    'lockscreen.enabled': 'true',
    'wifi.enabled': 'true',
    'dnt.enabled': 'false',
    'keyboard.vibration': 'false',
    'keyboard.clicksound': 'true',
    'keyboard.layouts.english': 'true',
    'keyboard.layouts.dvorak': 'false',
    'keyboard.layouts.otherlatins': 'false',
    'keyboard.layouts.cyrillic': 'false',
    'keyboard.layouts.hebrew': 'false',
    'keyboard.layouts.zhuying': 'true',
    'debug.grid.enabled' : 'false',
    'homescreen.wallpaper': 'default.png',
    'homescreen.ring': 'classic.wav',
    'language.current': 'en-US',
    'phone.vibration.incoming': 'false',
    'phone.ring.incoming': 'true',
    'screen.brightness': '0.5'
  };

  var DBNAME = 'mozSettings';     // Strings used by IndexedDB
  var STORENAME = 'mozSettings';

  var mozSettings;  // settings object created when needed

  // We always overwrite any existing mozSettings implementation.
  // This is to prevent surprises.  If you implement this in Gecko,
  // come here and remove this code
  Object.defineProperty(navigator, 'mozSettings', {
    get: function() {
      // This is a lazy getter. Don't set up the settings stuff
      // unless an app actually asks for it.
      try {
        if (!mozSettings)
          mozSettings = MozSettings();
        return mozSettings;
      } catch (e) {
        return null;
      }
    },
    enumerable: true,
    configurable: true
  });

  // Return object that will be the value of navigator.mozSettings
  function MozSettings() {
    // Open the IndexedDB database
    var settingsDB;
    var openreq = mozIndexedDB.open(DBNAME, 1);

    openreq.onsuccess = function() {
      settingsDB = openreq.result;
    }

    openreq.onerror = function(e) {
      console.log("Can't open mozSettings database!", e);
    };

    // The first time after the phone is flashed, or the profile
    // is deleted, this callback gets called to initialize the database
    openreq.onupgradeneeded = function() {
      var db = openreq.result;
      if (db.objectStoreNames.contains(STORENAME))
        db.deleteObjectStore(STORENAME);
      db.createObjectStore(STORENAME, { keyPath: 'key' });
    };

    // our hacked navigator.mozSettings has 2 methods: get and set
    return {
      // The set function is kind of easy becase we're leaving out the
      // part where it is supposed to return a request object and fire
      // error and success events.
      set: function(key, value) {
        // If the db isn't open yet, trigger the set when we
        // get the onsuccess
        var mozSettings = this;
        if (!settingsDB) {
          openreq.addEventListener('success', function() {
            mozSettings.set(key, value);
          });
          return;
        }

        var txn = settingsDB.transaction(STORENAME, IDBTransaction.READ_WRITE);
        var store = txn.objectStore(STORENAME);
        // Note that we convert the value to a string because
        // that is what the current clients of this hacked API seem to expect.
        // Probably not the correct behavior, though.
        var setreq = store.put({key: key, value: String(value)});

        setreq.onerror = function(e) {
          console.log('mozSettings failure', key, value, e);
        };
      },

      // The get function returns a request object that allows callback
      // registration.
      get: function(key) {
        // This event handling code copied from the localStorage version
        // of this api.  There are a lot of things it does not do right.
        // But good enough for the demo. Do not emulate this code.
        var onsuccess = [];
        var onerror = [];
        var settingsRequest = { // not the same as the db request below
          result: undefined,  // No result yet
          addEventListener: function(name, fn) {
            if (name === 'success')
              onsuccess.push(fn);
            if (name === 'error')
              onerror.push(fn);
          },
          set onsuccess(fn) {
            onsuccess.push(fn);
          },
          set onerror(fn) {
            onerror.push(fn);
          }
        };

        // This function queries the database and triggers
        // the appropriate callbacks of the request object
        function query() {
          var txn = settingsDB.transaction(STORENAME, IDBTransaction.READ_ONLY);
          var store = txn.objectStore(STORENAME);
          var dbreq = store.get(key);
          dbreq.onsuccess = function() {
            var result = dbreq.result || {
              value: DEFAULTS[key]
            };
            settingsRequest.result = result;
            onsuccess.forEach(function(cb) { cb(); });
          };
          dbreq.onerror = function(e) {
            console.log('mozSettings error querying setting', key, e);
            onerror.forEach(function(cb) { cb(); });
          };
        }

        // If the database is already open, query it now.
        // Otherwise, wait for it before querying
        if (settingsDB)
          query();
        else
          openreq.addEventListener('success', query);

        return settingsRequest;
      }
    };
  }
}());

(function (window) {
  var navigator = window.navigator;

  var contacts = [{
    id: 0,
    name: 'Andreas Gal',
    familyName: ['Andreas'],
    givenName: ['Gal'],
    tel: ['123-4242-4242'],
    email: ['gal@mozilla.com']
  },
  {
    id: 1,
    name: 'Coby Newman',
    familyName: ['Coby'],
    givenName: ['Newman'],
    tel: ['1-823-949-7735'],
    email: ['posuere.at@hendreritaarcu.com']
  },
  {
    id: 2,
    name: 'Caesar Velasquez',
    familyName: ['Caesar'],
    givenName: ['Velasquez'],
    tel: ['1-355-185-5419'],
    email: ['fames@Duis.org']
  },
  {
    id: 3,
    name: 'Hamilton Farrell',
    familyName: ['Hamilton'],
    givenName: ['Farrell'],
    tel: ['1-682-456-9186'],
    email: ['sem@Uttinciduntvehicula.com']
  },
  {
    id: 4,
    name: 'Emery Livingston',
    familyName: ['Emery'],
    givenName: ['Livingston'],
    tel: ['1-510-151-9801'],
    email: ['orci.luctus.et@massaInteger.com']
  },
  {
    id: 5,
    name: 'Griffith Heath',
    familyName: ['Griffith'],
    givenName: ['Heath'],
    tel: ['1-800-719-3201'],
    email: ['dapibus@Inlorem.ca']
  },
  {
    id: 6,
    name: 'Luke Stuart',
    familyName: ['Luke'],
    givenName: ['Stuart'],
    tel: ['1-120-910-1976'],
    email: ['congue@nibh.ca']
  },
  {
    id: 7,
    name: 'Brennan Love',
    familyName: ['Brennan'],
    givenName: ['Love'],
    tel: ['1-724-155-2807'],
    email: ['interdum.libero.dui@cursusvestibulum.edu']
  },
  {
    id: 8,
    name: 'Lamar Meadows',
    familyName: ['Lamar'],
    givenName: ['Meadows'],
    tel: ['1-976-164-8769'],
    email: ['tincidunt@non.com']
  },
  {
    id: 9,
    name: 'Erasmus Flynn',
    familyName: ['Erasmus'],
    givenName: ['Flynn'],
    tel: ['1-488-678-3487'],
    email: ['lorem.ut.aliquam@eu.ca']
  },
  {
    id: 10,
    name: 'Aladdin Ellison',
    familyName: ['Aladdin'],
    givenName: ['Ellison'],
    tel: ['1-977-743-6797'],
    email: ['sociosqu.ad@sollicitudin.org']
  },
  {
    id: 11,
    name: 'Valentine Rasmussen',
    familyName: ['Valentine'],
    givenName: ['Rasmussen'],
    tel: ['1-265-504-2025'],
    email: ['ultrices.iaculis@acsem.edu']
  },
  {
    id: 12,
    name: 'Deacon Murphy',
    familyName: ['Deacon'],
    givenName: ['Murphy'],
    tel: ['1-770-450-1221'],
    email: ['varius@erat.edu']
  },
  {
    id: 13,
    name: 'Paul Kennedy',
    familyName: ['Paul'],
    givenName: ['Kennedy'],
    tel: ['1-689-891-3529'],
    email: ['ac.arcu@vitae.edu']
  },
  {
    id: 14,
    name: 'Aaron Chase',
    familyName: ['Aaron'],
    givenName: ['Chase'],
    tel: ['1-451-574-7937'],
    email: ['tempor.bibendum.Donec@pharetraQuisque.edu']
  },
  {
    id: 15,
    name: 'Geoffrey Dunn',
    familyName: ['Geoffrey'],
    givenName: ['Dunn'],
    tel: ['1-924-387-2395'],
    email: ['a.malesuada@tellusPhasellus.com']
  },
  {
    id: 16,
    name: 'Ashton Russo',
    familyName: ['Ashton'],
    givenName: ['Russo'],
    tel: ['1-182-776-5600'],
    email: ['Aliquam.vulputate.ullamcorper@faucibusorci.edu']
  },
  {
    id: 17,
    name: 'Owen Noble',
    familyName: ['Owen'],
    givenName: ['Noble'],
    tel: ['1-463-693-1336'],
    email: ['et@vulputateveliteu.ca']
  },
  {
    id: 18,
    name: 'Kamal Blake',
    familyName: ['Kamal'],
    givenName: ['Blake'],
    tel: ['1-636-197-1985'],
    email: ['tempor@malesuada.edu']
  },
  {
    id: 19,
    name: 'Tyrone Delaney',
    familyName: ['Tyrone'],
    givenName: ['Delaney'],
    tel: ['1-886-920-6283'],
    email: ['est@aliquetsemut.com']
  },
  {
    id: 20,
    name: 'Ciaran Sellers',
    familyName: ['Ciaran'],
    givenName: ['Sellers'],
    tel: ['1-315-414-0323'],
    email: ['Etiam@Nulla.com']
  },
  {
    id: 21,
    name: 'Bernard Alford',
    familyName: ['Bernard'],
    givenName: ['Alford'],
    tel: ['1-430-958-2651'],
    email: ['elementum.lorem.ut@sociisnatoque.edu']
  },
  {
    id: 22,
    name: 'Kamal Cote',
    familyName: ['Kamal'],
    givenName: ['Cote'],
    tel: ['1-666-609-9141'],
    email: ['eleifend.egestas@cursus.edu']
  },
  {
    id: 23,
    name: 'Lucius Mckee',
    familyName: ['Lucius'],
    givenName: ['Mckee'],
    tel: ['1-224-590-6780'],
    email: ['Fusce.dolor@tellusnon.org']
  },
  {
    id: 24,
    name: 'Dale Coleman',
    familyName: ['Dale'],
    givenName: ['Coleman'],
    tel: ['1-320-245-3036'],
    email: ['dapibus.rutrum@ametlorem.org']
  },
  {
    id: 25,
    name: 'Kermit Nguyen',
    familyName: ['Kermit'],
    givenName: ['Nguyen'],
    tel: ['1-247-825-8563'],
    email: ['per@risusMorbi.org']
  },
  {
    id: 26,
    name: 'Timon Horton',
    familyName: ['Timon'],
    givenName: ['Horton'],
    tel: ['1-739-233-8981'],
    email: ['Etiam@nonummyultriciesornare.ca']
  },
  {
    id: 27,
    name: 'Dale Lamb',
    familyName: ['Dale'],
    givenName: ['Lamb'],
    tel: ['1-640-507-8295'],
    email: ['dapibus.id@pedeac.edu']
  },
  {
    id: 28,
    name: 'Owen Acevedo',
    familyName: ['Owen'],
    givenName: ['Acevedo'],
    tel: ['1-403-201-3170'],
    email: ['porttitor.tellus.non@dolorFusce.edu']
  },
  {
    id: 29,
    name: 'Richard Mckee',
    familyName: ['Richard'],
    givenName: ['Mckee'],
    tel: ['1-783-513-0684'],
    email: ['senectus.et.netus@Vestibulum.com']
  },
  {
    id: 30,
    name: 'Elijah Bass',
    familyName: ['Elijah'],
    givenName: ['Bass'],
    tel: ['1-632-950-0553'],
    email: ['erat@sapien.com']
  },
  {
    id: 31,
    name: 'Barrett Wells',
    familyName: ['Barrett'],
    givenName: ['Wells'],
    tel: ['1-112-180-5617'],
    email: ['interdum.ligula@varius.edu']
  },
  {
    id: 32,
    name: 'Herman Meyer',
    familyName: ['Herman'],
    givenName: ['Meyer'],
    tel: ['1-296-252-5507'],
    email: ['urna@vitaealiquameros.org']
  },
  {
    id: 33,
    name: 'Ashton Hinton',
    familyName: ['Ashton'],
    givenName: ['Hinton'],
    tel: ['1-695-256-8929'],
    email: ['lorem@mattisornare.org']
  },
  {
    id: 34,
    name: 'Harrison Marsh',
    familyName: ['Harrison'],
    givenName: ['Marsh'],
    tel: ['1-897-458-1730'],
    email: ['pharetra.felis.eget@auctor.com']
  },
  {
    id: 35,
    name: 'Benedict Santana',
    familyName: ['Benedict'],
    givenName: ['Santana'],
    tel: ['1-565-457-4828'],
    email: ['amet.metus.Aliquam@Maecenas.org']
  },
  {
    id: 36,
    name: 'David Church',
    familyName: ['David'],
    givenName: ['Church'],
    tel: ['1-179-353-3314'],
    email: ['Nullam.enim@Utsagittis.edu']
  },
  {
    id: 37,
    name: 'Colt Wolfe',
    familyName: ['Colt'],
    givenName: ['Wolfe'],
    tel: ['1-587-970-8581'],
    email: ['hendrerit.Donec.porttitor@tinciduntaliquam.org']
  },
  {
    id: 38,
    name: 'Carlos Bishop',
    familyName: ['Carlos'],
    givenName: ['Bishop'],
    tel: ['1-963-305-6702'],
    email: ['Nam@cursusNunc.org']
  },
  {
    id: 39,
    name: 'Dominic Ware',
    familyName: ['Dominic'],
    givenName: ['Ware'],
    tel: ['1-609-458-5449'],
    email: ['Fusce.aliquet@Etiam.ca']
  },
  {
    id: 40,
    name: 'Phillip Whitley',
    familyName: ['Phillip'],
    givenName: ['Whitley'],
    tel: ['1-284-955-1766'],
    email: ['per.inceptos.hymenaeos@nequesedsem.ca']
  },
  {
    id: 41,
    name: 'Valentine Sargent',
    familyName: ['Valentine'],
    givenName: ['Sargent'],
    tel: ['1-346-890-6417'],
    email: ['nec@dolorFusce.com']
  },
  {
    id: 42,
    name: 'Gabriel Huber',
    familyName: ['Gabriel'],
    givenName: ['Huber'],
    tel: ['1-399-465-0589'],
    email: ['pretium.neque@nislsemconsequat.ca']
  },
  {
    id: 43,
    name: 'George Tyler',
    familyName: ['George'],
    givenName: ['Tyler'],
    tel: ['1-739-571-2737'],
    email: ['blandit.viverra.Donec@dictum.ca']
  },
  {
    id: 44,
    name: 'Asher Carey',
    familyName: ['Asher'],
    givenName: ['Carey'],
    tel: ['1-477-425-4723'],
    email: ['torquent.per.conubia@blanditNamnulla.edu']
  },
  {
    id: 45,
    name: 'Anthony Solomon',
    familyName: ['Anthony'],
    givenName: ['Solomon'],
    tel: ['1-570-753-4296'],
    email: ['risus.Nunc@hendreritconsectetuercursus.com']
  },
  {
    id: 46,
    name: 'Griffith Fuller',
    familyName: ['Griffith'],
    givenName: ['Fuller'],
    tel: ['1-779-242-5342'],
    email: ['Suspendisse@aliquam.ca']
  },
  {
    id: 47,
    name: 'Beau Brewer',
    familyName: ['Beau'],
    givenName: ['Brewer'],
    tel: ['1-664-184-7334'],
    email: ['magna.tellus.faucibus@ultricesposuerecubilia.com']
  },
  {
    id: 48,
    name: 'Jordan Campbell',
    familyName: ['Jordan'],
    givenName: ['Campbell'],
    tel: ['1-593-938-2525'],
    email: ['Curae;.Phasellus@Morbiquis.ca']
  },
  {
    id: 49,
    name: 'Cyrus Cabrera',
    familyName: ['Cyrus'],
    givenName: ['Cabrera'],
    tel: ['1-915-748-1349'],
    email: ['lorem.tristique@acmetus.edu']
  },
  {
    id: 50,
    name: 'Hamilton Boone',
    familyName: ['Hamilton'],
    givenName: ['Boone'],
    tel: ['1-278-421-9845'],
    email: ['non.sapien@quamdignissimpharetra.edu']
  },
  {
    id: 51,
    name: 'Wallace Donovan',
    familyName: ['Wallace'],
    givenName: ['Donovan'],
    tel: ['1-940-175-9334'],
    email: ['justo@lacusMaurisnon.org']
  },
  {
    id: 52,
    name: 'Kirk Buckley',
    familyName: ['Kirk'],
    givenName: ['Buckley'],
    tel: ['1-283-177-6304'],
    email: ['Cras@Morbinon.edu']
  },
  {
    id: 53,
    name: 'Simon Hall',
    familyName: ['Simon'],
    givenName: ['Hall'],
    tel: ['1-269-202-5174'],
    email: ['mus.Proin@dolor.org']
  },
  {
    id: 54,
    name: 'Trevor Rush',
    familyName: ['Trevor'],
    givenName: ['Rush'],
    tel: ['1-865-595-9074'],
    email: ['Fusce@Donec.edu']
  },
  {
    id: 55,
    name: 'Todd Mccormick',
    familyName: ['Todd'],
    givenName: ['Mccormick'],
    tel: ['1-398-916-3514'],
    email: ['at@ornareelit.org']
  },
  {
    id: 56,
    name: 'Yuli Gay',
    familyName: ['Yuli'],
    givenName: ['Gay'],
    tel: ['1-198-196-4256'],
    email: ['Sed.congue.elit@Inornare.edu']
  },
  {
    id: 57,
    name: 'Joseph Frazier',
    familyName: ['Joseph'],
    givenName: ['Frazier'],
    tel: ['1-969-410-7180'],
    email: ['faucibus.ut.nulla@massa.org']
  },
  {
    id: 58,
    name: 'Ali Chase',
    familyName: ['Ali'],
    givenName: ['Chase'],
    tel: ['1-598-924-6112'],
    email: ['eu.elit@necanteMaecenas.edu']
  },
  {
    id: 59,
    name: 'Guy Simpson',
    familyName: ['Guy'],
    givenName: ['Simpson'],
    tel: ['1-558-377-3714'],
    email: ['in@mauriselit.edu']
  },
  {
    id: 60,
    name: 'Ivan Wynn',
    familyName: ['Ivan'],
    givenName: ['Wynn'],
    tel: ['1-274-885-0477'],
    email: ['lobortis.quis@Sed.com']
  },
  {
    id: 61,
    name: 'Preston Carpenter',
    familyName: ['Preston'],
    givenName: ['Carpenter'],
    tel: ['1-758-120-5270'],
    email: ['elit.Curabitur@vehiculaaliquet.edu']
  },
  {
    id: 62,
    name: 'Demetrius Santos',
    familyName: ['Demetrius'],
    givenName: ['Santos'],
    tel: ['1-913-961-7009'],
    email: ['id@magnaPhasellusdolor.com']
  },
  {
    id: 63,
    name: 'Dale Franklin',
    familyName: ['Dale'],
    givenName: ['Franklin'],
    tel: ['1-443-971-0116'],
    email: ['velit.Pellentesque@IntegerurnaVivamus.com']
  },
  {
    id: 64,
    name: 'Abraham Randolph',
    familyName: ['Abraham'],
    givenName: ['Randolph'],
    tel: ['1-368-169-0957'],
    email: ['egestas@maurisidsapien.com']
  },
  {
    id: 65,
    name: 'Hu Avila',
    familyName: ['Hu'],
    givenName: ['Avila'],
    tel: ['1-311-333-8877'],
    email: ['metus@adipiscinglacusUt.com']
  },
  {
    id: 66,
    name: 'Garth Trujillo',
    familyName: ['Garth'],
    givenName: ['Trujillo'],
    tel: ['1-409-494-1231'],
    email: ['commodo.hendrerit.Donec@etnunc.ca']
  },
  {
    id: 67,
    name: 'Quamar Buchanan',
    familyName: ['Quamar'],
    givenName: ['Buchanan'],
    tel: ['1-114-992-7225'],
    email: ['tellus@consequatpurusMaecenas.ca']
  },
  {
    id: 68,
    name: 'Ulysses Bishop',
    familyName: ['Ulysses'],
    givenName: ['Bishop'],
    tel: ['1-485-518-5941'],
    email: ['fermentum.fermentum.arcu@amalesuadaid.com']
  },
  {
    id: 69,
    name: 'Avram Knapp',
    familyName: ['Avram'],
    givenName: ['Knapp'],
    tel: ['1-307-139-5554'],
    email: ['est.ac.mattis@ultricesmauris.ca']
  },
  {
    id: 70,
    name: 'Conan Grant',
    familyName: ['Conan'],
    givenName: ['Grant'],
    tel: ['1-331-936-0280'],
    email: ['turpis@odio.com']
  },
  {
    id: 71,
    name: 'Chester Kemp',
    familyName: ['Chester'],
    givenName: ['Kemp'],
    tel: ['1-554-119-4848'],
    email: ['Aenean.gravida.nunc@eu.org']
  },
  {
    id: 72,
    name: 'Hedley Dudley',
    familyName: ['Hedley'],
    givenName: ['Dudley'],
    tel: ['1-578-607-6287'],
    email: ['Nunc@dignissimtemporarcu.ca']
  },
  {
    id: 73,
    name: 'Jermaine Avila',
    familyName: ['Jermaine'],
    givenName: ['Avila'],
    tel: ['1-860-455-2283'],
    email: ['accumsan@ametdapibusid.ca']
  },
  {
    id: 74,
    name: 'Kamal Hamilton',
    familyName: ['Kamal'],
    givenName: ['Hamilton'],
    tel: ['1-650-389-0920'],
    email: ['Fusce.dolor@nuncsed.ca']
  },
  {
    id: 75,
    name: 'Castor Maxwell',
    familyName: ['Castor'],
    givenName: ['Maxwell'],
    tel: ['1-260-489-7135'],
    email: ['diam.lorem@a.ca']
  },
  {
    id: 76,
    name: 'Lyle Burris',
    familyName: ['Lyle'],
    givenName: ['Burris'],
    tel: ['1-250-343-2038'],
    email: ['eget.lacus@tempordiamdictum.com']
  },
  {
    id: 77,
    name: 'Merrill Dalton',
    familyName: ['Merrill'],
    givenName: ['Dalton'],
    tel: ['1-851-675-1381'],
    email: ['eu.tempor@blanditmattisCras.edu']
  },
  {
    id: 78,
    name: 'Ezekiel Medina',
    familyName: ['Ezekiel'],
    givenName: ['Medina'],
    tel: ['1-389-582-3443'],
    email: ['lectus.sit@interdum.ca']
  },
  {
    id: 79,
    name: 'Len Tran',
    familyName: ['Len'],
    givenName: ['Tran'],
    tel: ['1-434-573-6114'],
    email: ['turpis.Aliquam.adipiscing@montesnasceturridiculus.com']
  },
  {
    id: 80,
    name: 'Len Dominguez',
    familyName: ['Len'],
    givenName: ['Dominguez'],
    tel: ['1-144-489-7487'],
    email: ['augue@Innec.ca']
  },
  {
    id: 81,
    name: 'Paul Lane',
    familyName: ['Paul'],
    givenName: ['Lane'],
    tel: ['1-448-169-4312'],
    email: ['lectus.Cum.sociis@dolornonummyac.org']
  },
  {
    id: 82,
    name: 'Eric Horne',
    familyName: ['Eric'],
    givenName: ['Horne'],
    tel: ['1-124-862-6890'],
    email: ['commodo.tincidunt.nibh@eleifendnuncrisus.com']
  },
  {
    id: 83,
    name: 'Elton Ellis',
    familyName: ['Elton'],
    givenName: ['Ellis'],
    tel: ['1-492-834-0019'],
    email: ['lorem.eu.metus@felis.ca']
  },
  {
    id: 84,
    name: 'Jameson Snyder',
    familyName: ['Jameson'],
    givenName: ['Snyder'],
    tel: ['1-811-590-5893'],
    email: ['fermentum@Nuncmaurissapien.org']
  },
  {
    id: 85,
    name: 'Micah Shelton',
    familyName: ['Micah'],
    givenName: ['Shelton'],
    tel: ['1-402-504-4026'],
    email: ['Nunc.mauris@malesuada.ca']
  },
  {
    id: 86,
    name: 'Evan Lester',
    familyName: ['Evan'],
    givenName: ['Lester'],
    tel: ['1-535-915-3570'],
    email: ['libero@adipiscingfringillaporttitor.org']
  },
  {
    id: 87,
    name: 'Reuben Dalton',
    familyName: ['Reuben'],
    givenName: ['Dalton'],
    tel: ['1-296-598-2504'],
    email: ['tincidunt.vehicula.risus@Craseutellus.com']
  },
  {
    id: 88,
    name: 'Beau Baird',
    familyName: ['Beau'],
    givenName: ['Baird'],
    tel: ['1-525-882-9957'],
    email: ['urna.suscipit.nonummy@facilisisvitae.com']
  },
  {
    id: 89,
    name: 'Hedley Olsen',
    familyName: ['Hedley'],
    givenName: ['Olsen'],
    tel: ['1-945-295-5863'],
    email: ['vulputate.ullamcorper@Vivamusnisi.org']
  },
  {
    id: 90,
    name: 'Oliver Todd',
    familyName: ['Oliver'],
    givenName: ['Todd'],
    tel: ['1-551-447-1296'],
    email: ['Donec.egestas@rutrum.edu']
  },
  {
    id: 91,
    name: 'Keegan Mayo',
    familyName: ['Keegan'],
    givenName: ['Mayo'],
    tel: ['1-351-848-2796'],
    email: ['ridiculus@Nuncsed.ca']
  },
  {
    id: 92,
    name: 'Wang Cote',
    familyName: ['Wang'],
    givenName: ['Cote'],
    tel: ['1-439-568-2013'],
    email: ['Morbi@tinciduntduiaugue.org']
  },
  {
    id: 93,
    name: 'Hyatt Rowe',
    familyName: ['Hyatt'],
    givenName: ['Rowe'],
    tel: ['1-596-765-3807'],
    email: ['eu.erat.semper@enimnonnisi.com']
  },
  {
    id: 94,
    name: 'Cade Wyatt',
    familyName: ['Cade'],
    givenName: ['Wyatt'],
    tel: ['1-988-289-5924'],
    email: ['erat.nonummy@sedpedeCum.com']
  },
  {
    id: 95,
    name: 'Stephen Vincent',
    familyName: ['Stephen'],
    givenName: ['Vincent'],
    tel: ['1-954-435-1259'],
    email: ['nec.euismod@ultricies.ca']
  },
  {
    id: 96,
    name: 'Tobias Cherry',
    familyName: ['Tobias'],
    givenName: ['Cherry'],
    tel: ['1-270-763-1111'],
    email: ['Nulla.aliquet@sit.com']
  },
  {
    id: 97,
    name: 'Keane Trevino',
    familyName: ['Keane'],
    givenName: ['Trevino'],
    tel: ['1-794-929-8599'],
    email: ['sem.semper.erat@Aliquamnecenim.edu']
  },
  {
    id: 98,
    name: 'Kennedy Cooley',
    familyName: ['Kennedy'],
    givenName: ['Cooley'],
    tel: ['1-725-946-1901'],
    email: ['urna.justo@Duismienim.edu']
  },
  {
    id: 99,
    name: 'Lucian Pope',
    familyName: ['Lucian'],
    givenName: ['Pope'],
    tel: ['1-186-946-8356'],
    email: ['justo.Proin@dis.com']
  },
  {
    id: 100,
    name: 'Hu Combs',
    familyName: ['Hu'],
    givenName: ['Combs'],
    tel: ['1-398-488-5222'],
    email: ['faucibus.lectus@nuncsedpede.com']
  }];

  if (('mozContacts' in navigator) && (navigator.mozContacts != null)) {
    // XXX: pre-filling the mozContacts database for now
    var request = window.navigator.mozContacts.find({});
    request.onsuccess = function contactFill() {
      if (request.result.length == 0) {
        contacts.forEach(function contactIterator(contact) {
          var newContact = new mozContact();
          newContact.init({name: contact.name,
                           familyName: contact.familyName[0],
                           givenName: contact.givenName[0],
                           tel: contact.tel[0],
                           email: contact.email[0]});

          var writeRequest = navigator.mozContacts.save(newContact);
        });
      }
    };
    return;
  }

  navigator.mozContacts = {
    find: function fakeContactFind() {
      var request = {result: contacts};
      setTimeout(function() {
        if (request.onsuccess) {
          request.onsuccess();
        }
      }, 0);

      return request;
    },
  };
})(this);

(function (window) {
  var navigator = window.navigator;
  if ('mozTelephony' in navigator)
    return;

  navigator.mozTelephony = {
    dial: function(number) {
      return {
        number: number,
        state: 'dialing',
        addEventListener: function() {},
        hangUp: function() {},
        removeEventListener: function(){}
      };
    },
    addEventListener: function(name, handler) {
    }
  };
})(this);

// Register a handler to automatically update apps when the app cache
// changes.
(function (window) {
  var cache = window.applicationCache;
  if (!cache)
    return;

  // We can force an update every time by uncommenting the next line:
  // cache.update();

  cache.addEventListener('updateready', function updateReady(evt) {
    // XXX Add a nice UI when an update is ready asking if the user
    // want to reload the application now.
    cache.swapCache();
    window.document.location.reload();
  });
})(this);

// Emulate device buttons. This is groteskly unsafe and should be removed
// soon.
(function (window) {
  var supportedEvents = { keydown: true, keyup: true };
  var listeners = [];

  var originalAddEventListener = window.addEventListener;
  window.addEventListener = function(type, listener, capture) {
    if (this === window && supportedEvents[type]) {
      listeners.push({ type: type, listener: listener, capture: capture });
    }
    originalAddEventListener.call(this, type, listener, capture);
  };

  var originalRemoveEventListener = window.removeEventListener;
  window.removeEventListener = function(type, listener) {
    if (this === window && supportedEvents[type]) {
      var newListeners = [];
      for (var n = 0; n < listeners.length; ++n) {
        if (listeners[n].type == type && listeners[n].listener == listener)
          continue;
        newListeners.push(listeners[n]);
      }
      listeners = newListeners;
    }
    originalRemoveEventListener.call(this, type, listener);
  }

  var KeyEventProto = {
    DOM_VK_HOME: 36
  };

  window.addEventListener("message", function(event) {
    var data = event.data;
    if (typeof data === "string" && data.indexOf("moz-key-") == 0) {
      var type,  key;
      if (data.indexOf("moz-key-down-") == 0) {
        type = "keydown";
        key = data.substr(13);
      } else if (data.indexOf("moz-key-up-") == 0) {
        type = "keyup";
        key = data.substr(11);
      } else {
        return;
      }
      key = KeyEvent[key];
      for (var n = 0; n < listeners.length; ++n) {
        if (listeners[n].type == type) {
          var fn = listeners[n].listener;
          var e = Object.create(KeyEventProto);
          e.type = type;
          e.keyCode = key;
          if (typeof fn === "function")
            fn(e);
          else if (typeof fn === "object" && fn.handleEvent)
            fn.handleEvent(e);
          if (listeners[n].capture)
            return;
        }
      }
    }
  });
})(this);
