/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// navigator.mozTelephony
(function(window) {
  var navigator = window.navigator;
  if ('mozTelephony' in navigator)
    return;

  var TelephonyCalls = [];

  navigator.mozTelephony = {
    dial: function(number) {
      var TelephonyCall = {
        number: number,
        state: 'dialing',
        addEventListener: function() {},
        hangUp: function() {},
        removeEventListener: function() {}
      };

      TelephonyCalls.push(TelephonyCall);

      return TelephonyCall;
    },
    addEventListener: function(name, handler) {
    },
    get calls() {
      return TelephonyCalls;
    },
    muted: false,
    speakerEnabled: false,

    // Stubs
    onincoming: null,
    oncallschanged: null
  };
})(this);


// If mozApps permission is denied, create a fake list of applications
(function(window) {
  if (navigator.mozApps.mgmt.oninstall)
    return;

  try {
    navigator.mozApps.mgmt.oninstall = function() {};
    navigator.mozApps.mgmt.oninstall = null;
  } catch(e) {
    if (document.location.protocol === 'file:') {
      var paths = document.location.pathname.split('/');
      paths.pop();
      paths.pop();
      paths.pop();
      var src = 'file://' + paths.join('/') + '/webapps.js';
    } else {
      var host = document.location.host;
      var domain = host.replace(/(^[\w\d]+\.)?([\w\d]+\.[a-z]+)/, '$2');
      var src = 'http://' + domain + '/webapps.js';
    }
    document.write('<script src="' + src + '"><\/script>');
  }
})(this);


// Register a handler to automatically update apps when the app cache
// changes.
(function(window) {
  if (!window.applicationCache)
    return;

  window.applicationCache.addEventListener('updateready', function(evt) {
      if (!navigator.mozNotification)
        return;

      // Figure out what our name is and where we come from
      navigator.mozApps.getSelf().onsuccess = function(e) {
        var app = e.target.result;
        var name = app.manifest.name;
        var origin = app.origin;

        // FIXME Localize this message:
        var notification = navigator.mozNotification.createNotification(
                   'Update Available',
                   'A new version of ' + name + ' is available');

        notification.onclick = function(event) {

          // If we're still running when the user taps on the notification
          // then ask if they want to reload now
          // FIXME: uncomment and localize when confirm() dialogs work
          /* if (confirm('Update ' + name + ' from ' + origin + ' now?')) */
          window.location.reload();
        };

        notification.show();
      }
  });
})(this);

// Emulate device buttons. This is groteskly unsafe and should be removed
// soon.
(function(window) {
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

  window.addEventListener('message', function(event) {
    var data = event.data;
    if (typeof data === 'string' && data.indexOf('moz-key-') == 0) {
      var type, key;
      if (data.indexOf('moz-key-down-') == 0) {
        type = 'keydown';
        key = data.substr(13);
      } else if (data.indexOf('moz-key-up-') == 0) {
        type = 'keyup';
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
          if (typeof fn === 'function')
            fn(e);
          else if (typeof fn === 'object' && fn.handleEvent)
            fn.handleEvent(e);
          if (listeners[n].capture)
            return;
        }
      }
    }
  });
})(this);

// navigator.mozWifiManager
(function(window) {
  var navigator = window.navigator;

  try {
    if ('mozWifiManager' in navigator)
      return;
  } catch (e) {
    //Bug 739234 - state[0] is undefined when initializing DOMWifiManager
    dump(e);
  }

  /** fake network list, where each network object looks like:
    * {
    *   ssid         : SSID string (human-readable name)
    *   bssid        : network identifier string
    *   capabilities : array of strings (supported authentication methods)
    *   signal       : 0-100 signal level (integer)
    *   connected    : boolean state
    * }
    */
  var fakeNetworks = {
    'Mozilla-G': {
      ssid: 'Mozilla-G',
      bssid: 'xx:xx:xx:xx:xx:xx',
      capabilities: ['WPA-EAP'],
      signal: 67,
      connected: false
    },
    'Livebox 6752': {
      ssid: 'Livebox 6752',
      bssid: 'xx:xx:xx:xx:xx:xx',
      capabilities: ['WEP'],
      signal: 32,
      connected: false
    },
    'Mozilla Guest': {
      ssid: 'Mozilla Guest',
      bssid: 'xx:xx:xx:xx:xx:xx',
      capabilities: [],
      signal: 98,
      connected: false
    },
    'Freebox 8953': {
      ssid: 'Freebox 8953',
      bssid: 'xx:xx:xx:xx:xx:xx',
      capabilities: ['WPA2-PSK'],
      signal: 89,
      connected: false
    }
  };

  navigator.mozWifiManager = {
    // true if the wifi is enabled
    enabled: false,

    // enables/disables the wifi
    setEnabled: function fakeSetEnabled(bool) {
      var self = this;
      var request = { result: bool };

      setTimeout(function() {
        if (request.onsuccess)
          request.onsuccess();
      }, 0);

      self.enabled = bool;
      return request;
    },

    // returns a list of visible networks
    getNetworks: function() {
      var request = { result: fakeNetworks };

      setTimeout(function() {
        if (request.onsuccess)
          request.onsuccess();
      }, 2000);

      return request;
    },

    // selects a network
    select: function(network) {
      var self = this;
      var connection = { result: network };
      var networkEvent = { network: network };

      setTimeout(function() {
        if (connection.onsuccess)
          connection.onsuccess();
      }, 0);

      setTimeout(function() {
        if (self.onassociate)
          self.onassociate(networkEvent);
      }, 1000);

      setTimeout(function() {
        self.connected = network;
        network.connected = true;
        if (self.onconnect)
          self.onconnect(networkEvent);
      }, 2000);

      return connection;
    },

    // returns a network object for the currently connected network (if any)
    connected: null
  };
})(this);

// document.mozL10n
(function(window) {
  var gL10nData = {};
  var gTextData = '';
  var gLanguage = '';

  // parser

  function evalString(text) {
    return text.replace(/\\\\/g, '\\')
               .replace(/\\n/g, '\n')
               .replace(/\\r/g, '\r')
               .replace(/\\t/g, '\t')
               .replace(/\\b/g, '\b')
               .replace(/\\f/g, '\f')
               .replace(/\\{/g, '{')
               .replace(/\\}/g, '}')
               .replace(/\\"/g, '"')
               .replace(/\\'/g, "'");
  }

  function parseProperties(text, lang) {
    var reBlank = /^\s*|\s*$/;
    var reComment = /^\s*#|^\s*$/;
    var reSection = /^\s*\[(.*)\]\s*$/;
    var reImport = /^\s*@import\s+url\((.*)\)\s*$/i;

    // parse the *.properties file into an associative array
    var currentLang = '*';
    var supportedLang = [];
    var skipLang = false;
    var data = [];
    var match = '';
    var entries = text.replace(reBlank, '').split(/[\r\n]+/);
    for (var i = 0; i < entries.length; i++) {
      var line = entries[i];

      // comment or blank line?
      if (reComment.test(line))
        continue;

      // section start?
      if (reSection.test(line)) {
        match = reSection.exec(line);
        currentLang = match[1];
        skipLang = (currentLang != lang) && (currentLang != '*');
        continue;
      } else if (skipLang) {
        continue;
      }

      // @import rule?
      if (reImport.test(line)) {
        match = reImport.exec(line);
      }

      // key-value pair
      var tmp = line.split('=');
      if (tmp.length > 1)
        data[tmp[0]] = evalString(tmp[1]);
    }

    // find the attribute descriptions, if any
    for (var key in data) {
      var id, prop, index = key.lastIndexOf('.');
      if (index > 0) { // attribute
        id = key.substring(0, index);
        prop = key.substr(index + 1);
      } else { // textContent, could be innerHTML as well
        id = key;
        prop = 'textContent';
      }
      if (!gL10nData[id])
        gL10nData[id] = {};
      gL10nData[id][prop] = data[key];
    }
  }

  function parse(text, lang) {
    gTextData += text;
    // we only support *.properties files at the moment
    return parseProperties(text, lang);
  }

  // load and parse the specified resource file
  function loadResource(href, lang, onSuccess, onFailure) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', href, true);
    xhr.overrideMimeType('text/plain; charset=utf-8');
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        if (xhr.status == 200 || xhr.status == 0) {
          parse(xhr.responseText, lang);
          if (onSuccess)
            onSuccess();
        } else {
          if (onFailure)
            onFailure();
        }
      }
    };
    xhr.send(null);
  }

  // load and parse all resources for the specified locale
  function loadLocale(lang, callback) {
    clear();

    // check all <link type="application/l10n" href="..." /> nodes
    // and load the resource files
    var langLinks = document.querySelectorAll('link[type="application/l10n"]');
    var langCount = langLinks.length;

    // start the callback when all resources are loaded
    var onResourceLoaded = null;
    var gResourceCount = 0;
    onResourceLoaded = function() {
      gResourceCount++;
      if (gResourceCount >= langCount) {
        // execute the [optional] callback
        if (callback)
          callback();
        // fire a 'localized' DOM event
        var evtObject = document.createEvent('Event');
        evtObject.initEvent('localized', false, false);
        evtObject.language = lang;
        window.dispatchEvent(evtObject);
      }
    }

    // load all resource files
    function l10nResourceLink(link) {
      var href = link.href;
      var type = link.type;
      this.load = function(lang, callback) {
        var applied = lang;
        loadResource(href, lang, callback, function() {
          console.warn(href + ' not found.');
          applied = '';
        });
        return applied; // return lang if found, an empty string if not found
      };
    }

    gLanguage = lang;
    for (var i = 0; i < langCount; i++) {
      var resource = new l10nResourceLink(langLinks[i]);
      var rv = resource.load(lang, onResourceLoaded);
      if (rv != lang) // lang not found, used default resource instead
        gLanguage = '';
    }
  }

  // fetch an l10n object, warn if not found
  function getL10nData(key) {
    var data = gL10nData[key];
    if (!data)
      console.warn('[l10n] #' + key + ' missing for [' + gLanguage + ']');
    return data;
  }

  // replace {{arguments}} with their values
  function substArguments(str, args) {
    var reArgs = /\{\{\s*([a-zA-Z\.]+)\s*\}\}/;
    var match = reArgs.exec(str);
    while (match) {
      if (!match || match.length < 2)
        return str; // argument key not found

      var arg = match[1];
      var sub = '';
      if (arg in args) {
        sub = args[arg];
      } else if (arg in gL10nData) {
        sub = gL10nData[arg].textContent;
      } else {
        console.warn('[l10n] could not find argument {{' + arg + '}}');
        return str;
      }

      str = str.substring(0, match.index) + sub +
            str.substr(match.index + match[0].length);
      match = reArgs.exec(str);
    }
    return str;
  }

  // translate a string
  function translateString(key, args) {
    var data = getL10nData(key);
    if (!data)
      return '{{' + key + '}}';
    return substArguments(data.textContent, args);
  }

  // translate an HTML element
  function translateElement(element) {
    if (!element || !element.dataset)
      return;

    // get the related l10n object
    var key = element.dataset.l10nId;
    var data = getL10nData(key);
    if (!data)
      return;

    // get arguments (if any)
    // TODO: more flexible parser?
    var args;
    if (element.dataset.l10nArgs) try {
      args = JSON.parse(element.dataset.l10nArgs);
    } catch (e) {
      console.warn('[l10n] could not parse arguments for #' + key + '');
    }

    // translate element
    // TODO: security check?
    for (var k in data)
      element[k] = substArguments(data[k], args);
  }

  // translate an HTML subtree
  function translateFragment(element) {
    element = element || document.querySelector('html');

    // check all translatable children (= w/ a `data-l10n-id' attribute)
    var children = element.querySelectorAll('*[data-l10n-id]');
    var elementCount = children.length;
    for (var i = 0; i < elementCount; i++)
      translateElement(children[i]);

    // translate element itself if necessary
    if (element.dataset.l10nId)
      translateElement(element);
  }

  // clear all l10n data
  function clear() {
    gL10nData = {};
    gTextData = '';
    gLanguage = '';
  }

  // load the default locale on startup
  window.addEventListener('DOMContentLoaded', function() {
    var lang = navigator.language;
    if (navigator.mozSettings) {
      var req = navigator.mozSettings.getLock().get('language.current');
      req.onsuccess = function() {
        loadLocale(req.result['language.current'] || lang, translateFragment);
      };
      req.onerror = function() {
        loadLocale(lang, translateFragment);
      };
    } else {
      loadLocale(lang, translateFragment);
    }
  });

  // Public API
  document.mozL10n = {
    // get a localized string
    get: translateString,

    // get|set the document language and direction
    get language() {
      return {
        // get|set the document language (ISO-639-1)
        get code() { return gLanguage; },
        set code(lang) { loadLocale(lang, translateFragment); },

        // get the direction (ltr|rtl) of the current language
        get direction() {
          // http://www.w3.org/International/questions/qa-scripts
          // Arabic, Hebrew, Farsi, Pashto, Urdu
          var rtlList = ['ar', 'he', 'fa', 'ps', 'ur'];
          return (rtlList.indexOf(gLanguage) >= 0) ? 'rtl' : 'ltr';
        }
      };
    }
  };
})(this);

