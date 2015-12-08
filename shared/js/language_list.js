'use strict';

/**
 * Helper object to find all supported languages;
 *
 * (Needs l10n.js or l20n.js, and the settings permission)
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

  _extendPseudo: function(languages, currentLang, pseudoEnabled) {
    // 1. remove buildtime pseudolocales is pseudo is disabled
    if (!pseudoEnabled) {
      for (var code in languages) {
        var isCurrent = (code === currentLang);
        if (code.indexOf('-x-ps') > -1 && !isCurrent) {
          delete languages[code];
        }
      }
    }

    if (!document.l10n) {
      return Promise.resolve(languages);
    }

    // 2. add the remaining runtime pseudolocales if pseudo enabled
    var runtimePseudoCodes = Object.keys(document.l10n.pseudo).filter(
      code => !(code in languages) && (code === currentLang || pseudoEnabled));

    function obj(arr1, arr2) {
      // JSHint doesn't work with array comprehensions 
      /* jshint ignore: start */
      const zipped = [for (x of arr1) for (y of arr2) [x, y]];
      return zipped.reduce(
        (obj, [x, y]) => Object.assign(obj, { [x]: y }), {});
      /* jshint ignore: end */
    }

    return Promise.all(
      runtimePseudoCodes.map(
        code => document.l10n.pseudo[code].getName())).then(
      names => Object.assign(languages, obj(runtimePseudoCodes, names)));
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
  },

  _removeWithNoSpeech: function(languages, srEnabled) {
    if (srEnabled) {
      var speechLangs = new Set(
        [for (v of window.speechSynthesis.getVoices()) v.lang.split('-')[0]]);
      for (var langName in languages) {
        if (!speechLangs.has(langName.split('-')[0])) {
          delete languages[langName];
        }
      }
    }
  },

  _copyObj: function(obj) {
    var copy = Object.create(null);
    for (var prop in obj) {
      copy[prop] = obj[prop];
    }
    return copy;
  },

  _parseVersion: function(ver) {
    return ver.split('.').slice(0, 2).join('.');
  },

  _build: function() {
    return Promise.all([
      this._languages || (this._languages = this._readFile(LOCALES_FILE)),
      this._readSetting('language.current'),
      this._readSetting('devtools.pseudolocalization.enabled')
    ]).then(([langsFromFile, current, pseudoEnabled]) => {
      var langs = this._copyObj(langsFromFile);
      return Promise.all([
        this._extendPseudo(langs, current, pseudoEnabled),
        this._readSetting('langpack.channel'),
        current,
        this._readSetting('accessibility.screenreader'),
        navigator.mozApps.getAdditionalLanguages()
      ]);
    }).then(([langs, ver, current, srEnabled, addl]) => {
      this._extendAdditional(langs, this._parseVersion(ver), addl);
      this._removeWithNoSpeech(langs, srEnabled);
      return [langs, current];
    });
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
    // Arabic, Hebrew, Farsi, Pashto, Bidi English (pseudo), Urdu
    var rtlList = ['ar', 'he', 'fa', 'ps', 'ar-x-psbidi', 'ur'];
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
