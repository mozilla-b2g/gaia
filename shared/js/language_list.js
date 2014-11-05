'use strict';

/**
 * Helper object to find all supported languages;
 *
 * (Needs mozL10n and the settings permission)
 */

(function(exports) {

var LOCALES_FILE = '/shared/resources/languages.json';

function readFile(file, callback) {
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function loadFile() {
    if (xhr.readyState === 4) {
      if (xhr.status === 0 || xhr.status === 200) {
        callback(xhr.response);
      } else {
        console.error('Failed to fetch file: ' + file, xhr.statusText);
      }
    }
  };
  xhr.open('GET', file, true); // async
  xhr.responseType = 'json';
  xhr.send();
}

function readSetting(name, callback) {
  var settings = window.navigator.mozSettings;
  if (!settings || !settings.createLock) {
    return callback(null);
  }

  var req = settings.createLock().get(name);
  req.onsuccess = function _onsuccess() {
    callback(req.result[name]);
  };
  req.onerror = function _onerror() {
    console.error('Error checking setting ' + name);
  };
}

exports.LanguageList = {

  _languages: null,

  // for stubbing in tests
  _readFile: readFile,
  _readSetting: readSetting,

  _extend: function(currentLang, qpsEnabled, languagesFromFile) {
    if (!navigator.mozL10n) {
      return languagesFromFile;
    }

    var languages = Object.create(languagesFromFile);

    for (var lang in navigator.mozL10n.qps) {
      var isCurrent = (lang === currentLang);
      if (isCurrent || qpsEnabled) {
        languages[lang] = navigator.mozL10n.qps[lang].name;
      }
    }

    return languages;
  },

  _build: function(callback) {
    var settings = {};

    function onSettingRead(name, value) {
      /* jshint -W040 */
      settings[name] = value;
      if (Object.keys(settings).length === 2) {
        var langs = this._extend(
          settings['language.current'],
          settings['devtools.qps.enabled'],
          this._languages);
        callback(langs, settings['language.current']);
      }
    }

    this._readSetting('language.current',
                      onSettingRead.bind(this, 'language.current'));
    this._readSetting('devtools.qps.enabled',
                      onSettingRead.bind(this, 'devtools.qps.enabled'));
  },

  get: function(callback) {
    if (!callback) {
      return;
    }

    if (this._languages) {
      this._build(callback);
    } else {
      var self = this;
      this._readFile(LOCALES_FILE, function getLanguages(data) {
        if (data) {
          self._languages = data;
          self._build(callback);
        }
      });
    }
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
