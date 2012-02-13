/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// MozApps - Bug 709015
(function (window) {
  var navigator = window.navigator;
  if (navigator.mozApps)
    return;

  var webapps = [
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
                 { // camera
                   'installOrigin': 'http://gaiamobile.org:8888',
                   'origin': '../camera',
                   'receipt': null,
                   'installTime': 1323339869000,
                   manifest: {
                     'name': 'Camera',
                     'description': 'Gaia Camera',
                     'launch_path': '/camera.html',
                     'developer': {
                       'name': 'The Gaia Team',
                       'url': 'https://github.com/andreasgal/gaia'
                     },
                     'icons': {
                       '120': '/style/icons/Camera.png'
                     }
                   }
                 },
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
                 }
  ];

  Object.freeze(webapps);

  navigator.mozApps = {
    enumerate: function(callback) {
      callback(webapps);
    }
  };
})(this);

// mozSettings (bug 678695)
(function (window) {
  var navigator = window.navigator;
  if (window.mozSettings)
    return;

  var prefix = "settings:";

  var immediates = [];
  var magic = "moz-immediate";

  window.addEventListener("message", function(event) {
    if (event.source === window && event.data === magic) {
      event.stopPropagation();
      while (immediates.length > 0) {
        var fn = immediates.shift();
        fn();
      }
    }
  }, true);

  function setImmediate(fn) {
    if (immediates.length === 0)
      window.postMessage(magic, "*");
    immediates.push(fn);
  }

  navigator.mozSettings = {
    get: function(key) {
      var onsuccess = [];
      var request = {
        addEventListener: function(name, fn) {
          if (name === "success")
            onsuccess.push(fn);
        },
        set onsuccess(fn) {
          onsuccess.push(fn);
        },
      };
      setImmediate(function() {
        request.result = {
          key: key,
          value: localStorage.getItem(prefix + key)
        };
        while (onsuccess.length > 0) {
          var fn = onsuccess.shift();
          fn();
        }
      });
      return request;
    },
    set: function(key, value) {
      localStorage.setItem(prefix + key, value);
    }
  };
})(this);
