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
  } catch (e) {
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
  var gMacros = {};

  // pre-defined macros
  gMacros.plural = function(str, param, key, prop) {
    var n = parseFloat(param);
    if (isNaN(n))
      return str;

    // TODO: support other properties (l20n still doesn't...)
    if (prop != 'textContent')
      return str;

    // initialize _pluralRules
    if (!gMacros._pluralRules)
      gMacros._pluralRules = getPluralRules(gLanguage);
    var index = '[' + gMacros._pluralRules(n) + ']';

    // try to find a [zero|one|two] key if it's defined
    if (n == 0 && (key + '[zero]') in gL10nData) {
      str = gL10nData[key + '[zero]'][prop];
    } else if (n == 1 && (key + '[one]') in gL10nData) {
      str = gL10nData[key + '[one]'][prop];
    } else if (n == 2 && (key + '[two]') in gL10nData) {
      str = gL10nData[key + '[two]'][prop];
    } else if ((key + index) in gL10nData) {
      str = gL10nData[key + index][prop];
    }

    return str;
  };

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

  function parseProperties(text, lang, baseURL) {
    var data = [];

    // token expressions
    var reBlank = /^\s*|\s*$/;
    var reComment = /^\s*#|^\s*$/;
    var reSection = /^\s*\[(.*)\]\s*$/;
    var reImport = /^\s*@import\s+url\((.*)\)\s*$/i;
    var reSplit = /\s*=\s*/; // TODO: support backslashes to escape EOLs

    // parse the *.properties file into an associative array
    function parseRawLines(rawText, extendedSyntax) {
      var entries = rawText.replace(reBlank, '').split(/[\r\n]+/);
      var currentLang = '*';
      var genericLang = lang.replace(/-[a-z]+$/i, '');
      var skipLang = false;
      var match = '';

      for (var i = 0; i < entries.length; i++) {
        var line = entries[i];

        // comment or blank line?
        if (reComment.test(line))
          continue;

        // the extended syntax supports [lang] sections and @import rules
        if (extendedSyntax) {
          if (reSection.test(line)) { // section start?
            match = reSection.exec(line);
            currentLang = match[1];
            skipLang = (currentLang != lang) && (currentLang != genericLang) &&
              (currentLang != '*');
            continue;
          } else if (skipLang) {
            continue;
          }
          if (reImport.test(line)) { // @import rule?
            match = reImport.exec(line);
            loadImport(baseURL + match[1]); // load the resource synchronously
          }
        }

        // key-value pair
        var tmp = line.split(reSplit);
        if (tmp.length > 1)
          data[tmp[0]] = evalString(tmp[1]);
      }
    }

    // import another *.properties file
    function loadImport(href) {
      loadResource(href, function(content) {
        parseRawLines(content, false); // don't allow recursive imports
      }, false, false); // load synchronously
    }

    parseRawLines(text, true);

    // find the attribute descriptions, if any
    for (var key in data) {
      var id, prop, index = key.lastIndexOf('.');
      if (index > 0) { // an attribute has been specified
        id = key.substring(0, index);
        prop = key.substr(index + 1);
      } else {     // no attribute: assuming .textContent by default
        id = key;  // (this could have been .innerHTML as well...)
        prop = 'textContent';
      }
      if (!gL10nData[id])
        gL10nData[id] = {};
      gL10nData[id][prop] = data[key];
    }
  }

  function parse(text, lang, baseURL) {
    gTextData += text;
    // we only support *.properties files at the moment
    return parseProperties(text, lang, baseURL);
  }

  // load the specified resource file
  function loadResource(href, onSuccess, onFailure, asynchronous) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', href, asynchronous);
    xhr.overrideMimeType('text/plain; charset=utf-8');
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        if (xhr.status == 200 || xhr.status == 0) {
          if (onSuccess)
            onSuccess(xhr.responseText);
        } else {
          if (onFailure)
            onFailure();
        }
      }
    };
    xhr.send(null);
  }

  // load and parse the specified resource file
  function loadAndParse(href, lang, onSuccess, onFailure) {
    var baseURL = href.replace(/\/[^\/]*$/, '/');
    loadResource(href, function(response) {
      parse(response, lang, baseURL);
      if (onSuccess)
        onSuccess();
    }, onFailure, true);
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
        loadAndParse(href, lang, callback, function() {
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

  // fetch an l10n object, warn if not found, apply `args' if possible
  function getL10nData(key, args) {
    var data = gL10nData[key];
    if (!data)
      console.warn('[l10n] #' + key + ' missing for [' + gLanguage + ']');

    /** This is where l10n expressions should be processed.
      * The plan is to support C-style expressions from the l20n project;
      * until then, only two kinds of simple expressions are supported:
      *   {[ index ]} and {{ arguments }}.
      */
    var rv = {};
    for (var prop in data) {
      var str = data[prop];
      str = substIndexes(str, args, key, prop);
      str = substArguments(str, args);
      rv[prop] = str;
    }
    return rv;
  }

  // replace {[macros]} with their values
  function substIndexes(str, args, key, prop) {
    var reIndex = /\{\[\s*([a-zA-Z]+)\(([a-zA-Z]+)\)\s*\]\}/;
    var reMatch = reIndex.exec(str);
    if (!reMatch || !reMatch.length)
      return str;

    // an index/macro has been found
    // Note: at the moment, only one parameter is supported
    var macroName = reMatch[1];
    var paramName = reMatch[2];
    var param;
    if (args && paramName in args) {
      param = args[paramName];
    } else if (paramName in gL10nData) {
      param = gL10nData[paramName];
    }

    // there's no macro parser yet: it has to be defined in gMacros
    if (macroName in gMacros) {
      var macro = gMacros[macroName];
      str = macro(str, param, key, prop);
    }
    return str;
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

  // translate an HTML element
  function translateElement(element) {
    if (!element || !element.dataset)
      return;

    // get arguments (if any)
    // TODO: more flexible parser?
    var args;
    if (element.dataset.l10nArgs) try {
      args = JSON.parse(element.dataset.l10nArgs);
    } catch (e) {
      console.warn('[l10n] could not parse arguments for #' + key + '');
    }

    // get the related l10n object
    var key = element.dataset.l10nId;
    var data = getL10nData(key, args);
    if (!data)
      return;

    // translate element
    // TODO: security check?
    for (var k in data)
      element[k] = data[k];
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
    // TODO: clear all non predefined macros.
    // There's no such macro /yet/ but we're planning to have some...
  }

  // rules for plural forms (shared with JetPack)
  // http://unicode.org/repos/cldr-tmp/trunk/diff/supplemental/language_plural_rules.html
  // https://github.com/mozilla/addon-sdk/blob/master/python-lib/plural-rules-generator.py
  function getPluralRules(lang) {
    var locales2rules = {
      'af': 3,
      'ak': 4,
      'am': 4,
      'ar': 1,
      'asa': 3,
      'az': 0,
      'be': 11,
      'bem': 3,
      'bez': 3,
      'bg': 3,
      'bh': 4,
      'bm': 0,
      'bn': 3,
      'bo': 0,
      'br': 20,
      'brx': 3,
      'bs': 11,
      'ca': 3,
      'cgg': 3,
      'chr': 3,
      'cs': 12,
      'cy': 17,
      'da': 3,
      'de': 3,
      'dv': 3,
      'dz': 0,
      'ee': 3,
      'el': 3,
      'en': 3,
      'eo': 3,
      'es': 3,
      'et': 3,
      'eu': 3,
      'fa': 0,
      'ff': 5,
      'fi': 3,
      'fil': 4,
      'fo': 3,
      'fr': 5,
      'fur': 3,
      'fy': 3,
      'ga': 8,
      'gd': 24,
      'gl': 3,
      'gsw': 3,
      'gu': 3,
      'guw': 4,
      'gv': 23,
      'ha': 3,
      'haw': 3,
      'he': 2,
      'hi': 4,
      'hr': 11,
      'hu': 0,
      'id': 0,
      'ig': 0,
      'ii': 0,
      'is': 3,
      'it': 3,
      'iu': 7,
      'ja': 0,
      'jmc': 3,
      'jv': 0,
      'ka': 0,
      'kab': 5,
      'kaj': 3,
      'kcg': 3,
      'kde': 0,
      'kea': 0,
      'kk': 3,
      'kl': 3,
      'km': 0,
      'kn': 0,
      'ko': 0,
      'ksb': 3,
      'ksh': 21,
      'ku': 3,
      'kw': 7,
      'lag': 18,
      'lb': 3,
      'lg': 3,
      'ln': 4,
      'lo': 0,
      'lt': 10,
      'lv': 6,
      'mas': 3,
      'mg': 4,
      'mk': 16,
      'ml': 3,
      'mn': 3,
      'mo': 9,
      'mr': 3,
      'ms': 0,
      'mt': 15,
      'my': 0,
      'nah': 3,
      'naq': 7,
      'nb': 3,
      'nd': 3,
      'ne': 3,
      'nl': 3,
      'nn': 3,
      'no': 3,
      'nr': 3,
      'nso': 4,
      'ny': 3,
      'nyn': 3,
      'om': 3,
      'or': 3,
      'pa': 3,
      'pap': 3,
      'pl': 13,
      'ps': 3,
      'pt': 3,
      'rm': 3,
      'ro': 9,
      'rof': 3,
      'ru': 11,
      'rwk': 3,
      'sah': 0,
      'saq': 3,
      'se': 7,
      'seh': 3,
      'ses': 0,
      'sg': 0,
      'sh': 11,
      'shi': 19,
      'sk': 12,
      'sl': 14,
      'sma': 7,
      'smi': 7,
      'smj': 7,
      'smn': 7,
      'sms': 7,
      'sn': 3,
      'so': 3,
      'sq': 3,
      'sr': 11,
      'ss': 3,
      'ssy': 3,
      'st': 3,
      'sv': 3,
      'sw': 3,
      'syr': 3,
      'ta': 3,
      'te': 3,
      'teo': 3,
      'th': 0,
      'ti': 4,
      'tig': 3,
      'tk': 3,
      'tl': 4,
      'tn': 3,
      'to': 0,
      'tr': 0,
      'ts': 3,
      'tzm': 22,
      'uk': 11,
      'ur': 3,
      've': 3,
      'vi': 0,
      'vun': 3,
      'wa': 4,
      'wae': 3,
      'wo': 0,
      'xh': 3,
      'xog': 3,
      'yo': 0,
      'zh': 0,
      'zu': 3
    };

    // utility functions for plural rules methods
    function isIn(n, list) {
      return list.indexOf(n) !== -1;
    }
    function isBetween(n, start, end) {
      return start <= n && n <= end;
    }

    // list of all plural rules methods:
    // map an integer to the plural form name to use
    var pluralRules = {
      '0': function(n) {
        return 'other';
      },
      '1': function(n) {
        if ((isBetween((n % 100), 3, 10)))
          return 'few';
        if (n == 0)
          return 'zero';
        if ((isBetween((n % 100), 11, 99)))
          return 'many';
        if (n == 2)
          return 'two';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '2': function(n) {
        if (n != 0 && (n % 10) == 0)
          return 'many';
        if (n == 2)
          return 'two';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '3': function(n) {
        if (n == 1)
          return 'one';
        return 'other';
      },
      '4': function(n) {
        if ((isBetween(n, 0, 1)))
          return 'one';
        return 'other';
      },
      '5': function(n) {
        if ((isBetween(n, 0, 2)) && n != 2)
          return 'one';
        return 'other';
      },
      '6': function(n) {
        if (n == 0)
          return 'zero';
        if ((n % 10) == 1 && (n % 100) != 11)
          return 'one';
        return 'other';
      },
      '7': function(n) {
        if (n == 2)
          return 'two';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '8': function(n) {
        if ((isBetween(n, 3, 6)))
          return 'few';
        if ((isBetween(n, 7, 10)))
          return 'many';
        if (n == 2)
          return 'two';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '9': function(n) {
        if (n == 0 || n != 1 && (isBetween((n % 100), 1, 19)))
          return 'few';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '10': function(n) {
        if ((isBetween((n % 10), 2, 9)) && !(isBetween((n % 100), 11, 19)))
          return 'few';
        if ((n % 10) == 1 && !(isBetween((n % 100), 11, 19)))
          return 'one';
        return 'other';
      },
      '11': function(n) {
        if ((isBetween((n % 10), 2, 4)) && !(isBetween((n % 100), 12, 14)))
          return 'few';
        if ((n % 10) == 0 ||
            (isBetween((n % 10), 5, 9)) ||
            (isBetween((n % 100), 11, 14)))
          return 'many';
        if ((n % 10) == 1 && (n % 100) != 11)
          return 'one';
        return 'other';
      },
      '12': function(n) {
        if ((isBetween(n, 2, 4)))
          return 'few';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '13': function(n) {
        if ((isBetween((n % 10), 2, 4)) && !(isBetween((n % 100), 12, 14)))
          return 'few';
        if (n != 1 && (isBetween((n % 10), 0, 1)) ||
            (isBetween((n % 10), 5, 9)) ||
            (isBetween((n % 100), 12, 14)))
          return 'many';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '14': function(n) {
        if ((isBetween((n % 100), 3, 4)))
          return 'few';
        if ((n % 100) == 2)
          return 'two';
        if ((n % 100) == 1)
          return 'one';
        return 'other';
      },
      '15': function(n) {
        if (n == 0 || (isBetween((n % 100), 2, 10)))
          return 'few';
        if ((isBetween((n % 100), 11, 19)))
          return 'many';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '16': function(n) {
        if ((n % 10) == 1 && n != 11)
          return 'one';
        return 'other';
      },
      '17': function(n) {
        if (n == 3)
          return 'few';
        if (n == 0)
          return 'zero';
        if (n == 6)
          return 'many';
        if (n == 2)
          return 'two';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '18': function(n) {
        if (n == 0)
          return 'zero';
        if ((isBetween(n, 0, 2)) && n != 0 && n != 2)
          return 'one';
        return 'other';
      },
      '19': function(n) {
        if ((isBetween(n, 2, 10)))
          return 'few';
        if ((isBetween(n, 0, 1)))
          return 'one';
        return 'other';
      },
      '20': function(n) {
        if ((isBetween((n % 10), 3, 4) || ((n % 10) == 9)) && !(
              isBetween((n % 100), 10, 19) ||
              isBetween((n % 100), 70, 79) ||
              isBetween((n % 100), 90, 99)
            ))
          return 'few';
        if ((n % 1000000) == 0 && n != 0)
          return 'many';
        if ((n % 10) == 2 && !isIn((n % 100), [12, 72, 92]))
          return 'two';
        if ((n % 10) == 1 && !isIn((n % 100), [11, 71, 91]))
          return 'one';
        return 'other';
      },
      '21': function(n) {
        if (n == 0)
          return 'zero';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '22': function(n) {
        if ((isBetween(n, 0, 1)) || (isBetween(n, 11, 99)))
          return 'one';
        return 'other';
      },
      '23': function(n) {
        if ((isBetween((n % 10), 1, 2)) || (n % 20) == 0)
          return 'one';
        return 'other';
      },
      '24': function(n) {
        if ((isBetween(n, 3, 10) || isBetween(n, 13, 19)))
          return 'few';
        if (isIn(n, [2, 12]))
          return 'two';
        if (isIn(n, [1, 11]))
          return 'one';
        return 'other';
      }
    };

    /** Return a function that gives the plural form name for a given integer
      * for the specified `locale`
      *   var fun = getPluralRules('en');
      *   fun(1)    -> 'one'
      *   fun(0)    -> 'other'
      *   fun(1000) -> 'other'
      */
    var index = locales2rules[lang.replace(/-.*$/, '')];
    if (!(index in pluralRules)) {
      console.warn('[l10n] plural form unknown for [' + lang + ']');
      return function() { return 'other'; };
    }
    return pluralRules[index];
  }

  // load the default locale on startup
  window.addEventListener('DOMContentLoaded', function() {
    loadLocale(navigator.language, translateFragment);
  });

  // Public API
  document.mozL10n = {
    // get a localized string
    get: function(key, args, fallback) {
      var data = getL10nData(key, args) || fallback;
      return data ? data.textContent : '{{' + key + '}}';
    },

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

