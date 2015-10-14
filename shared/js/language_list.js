'use strict';

/**
 * Helper object to find all supported languages;
 *
 * (Needs mozL10n and the settings permission)
 */

(function(exports) {

var LOCALES_FILE = '/shared/resources/languages.json';

function readFile(file, callback) {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function loadFile() {
      if (xhr.readyState === 4) {
        if (xhr.status === 0 || xhr.status === 200) {
          resolve(xhr.response);
        } else {
          reject(xhr.statusText);
        }
      }
    };
    xhr.open('GET', file, true); // async
    xhr.responseType = 'json';
    xhr.send();
  });
}

function onError(name) {
  console.error('Error checking setting ' + name);
}

function readSetting(name, callback) {
  var settings = window.navigator.mozSettings;
  if (!settings || !settings.createLock) {
    return callback(null);
  }

  return settings.createLock().get(name).then(function(res) {
    return res[name];
  }, onError.bind(null, name));
}

exports.LanguageList = {

  _languages: null,

  // for stubbing in tests
  _readFile: readFile,
  _readSetting: readSetting,

  _extendPseudo: function(languages, currentLang, qpsEnabled) {
    if (!navigator.mozL10n) {
      return languages;
    }

    for (var lang in navigator.mozL10n.qps) {
      var isCurrent = (lang === currentLang);
      if (isCurrent || qpsEnabled) {
        languages[lang] = navigator.mozL10n.qps[lang].name;
      }
    }

    return languages;
  },

  _extendAdditional: function(languages, ver, additional) {
    /* jshint boss:true */

    for (var lang in additional) {
      for (var i = 0, locale; locale = additional[lang][i]; i++) {
        if (locale.target === ver) {
          languages[lang] = locale.name;
          break;
        }
      }
    }

    return languages;
  },

  _parseVersion: function(ver) {
    return ver.split('.').slice(0, 2).join('.');
  },

  _build: function() {
    return Promise.all([
      this._languages || (this._languages = this._readFile(LOCALES_FILE)),
      this._readSetting('deviceinfo.os'),
      this._readSetting('language.current'),
      this._readSetting('devtools.qps.enabled'),
      navigator.mozApps.getAdditionalLanguages()
    ]).then(function([langsFromFile, ver, current, qpsEnabled, addl]) {
      var langs = Object.create(langsFromFile);
      this._extendPseudo(langs, current, qpsEnabled);
      this._extendAdditional(langs, this._parseVersion(ver), addl);
      return [langs, current];
    }.bind(this));

  },

  get: function(callback) {
    if (!callback) {
      return;
    }

    this._build().then(Function.prototype.apply.bind(callback, null));
  },

  wrapBidi: function(langCode, langName) {
    // Right-to-Left (RTL) languages:
    // (http://www.w3.org/International/questions/qa-scripts)
    // Arabic, Hebrew, Farsi, Pashto, Mirrored English (pseudo), Urdu
    var rtlList = ['ar', 'he', 'fa', 'ps', 'qps-plocm', 'ur'];
    // Use script direction control-characters to wrap the text labels
    // since markup (i.e. <bdo>) does not work inside <option> tags
    // http://www.w3.org/International/tutorials/bidi-xhtml/#nomarkup
    var lEmbedBegin =
      (rtlList.indexOf(langCode) >= 0) ? '\u202b' : '\u202a';
    var lEmbedEnd = '\u202c';
    // The control-characters enforce the language-specific script
    // direction to correctly display the text label (Bug #851457)
    return lEmbedBegin + langName + lEmbedEnd;
  }

};

}(window));
