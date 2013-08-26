
'use strict';

var Configurator = (function() {
  var conf = {};

  // Path of the single variant configuration file
  var SINGLE_VARIANT_CONF_FILE = 'js/singlevariantconf.json';

  // Keeps the list of single variant apps, indexed by manifestURL
  var singleVariantApps = {};

  var dummyProvider = {
    init: function() {
      // Do nothing
    },

    destroy: function() {
      // Do nothing
    }
  };

  function onLoadInitJSON(loadedData) {
    conf = loadedData;
    var searchPage = conf.search_page;
    if (searchPage) {
      var provider = window[searchPage.provider] || dummyProvider;
      if (searchPage.enabled) {
        provider.init();
        Homescreen.init(searchPage.separate_page ? 1 : 0);
      } else {
        startHomescreenByDefault();
        setTimeout(provider.destroy, 0);
      }
    }
  }

  function onErrorInitJSON(e) {
    conf = {};
    console.error('Failed parsing homescreen configuration file: ' + e);
    startHomescreenByDefault();
  }

  function load(file, successCallback, errorCallback) {
    var xhr = new XMLHttpRequest();
    xhr.overrideMimeType('application/json');
    xhr.open('GET', file, true);
    xhr.send(null);

    xhr.onload = function _xhrOnLoad(evt) {
      try {
        successCallback(JSON.parse(xhr.responseText));
      } catch (e) {
        errorCallback(e);
      }
    };

    xhr.onerror = function _xhrOnError(evt) {
      errorCallback('file not found');
    };
  }

  function loadSingleVariantConf() {
    if (!IccHelper.enabled) {
      console.error('IccHelper isn\'t enabled. SingleVariant configuration' +
                    ' can\'t be loaded');
      return;
    }

    // Given a number returns a three characters string padding with zeroes
    // to the left until the desired length (3) is reached
    function normalizeCode(aCode) {
      var ncode = '' + aCode;
      while (ncode.length < 3) {
        ncode = '0' + ncode;
      }
      return ncode;
    }

    var getMccMnc = function getMccMnc() {
      var mcc = IccHelper.iccInfo.mcc;
      var mnc = IccHelper.iccInfo.mnc;

      if ((mcc !== undefined) && (mcc !== null) &&
          (mnc !== undefined) && (mnc !== null)) {
        return normalizeCode(mcc) + '-' + normalizeCode(mnc);
      }
    };

    function loadSVConfFileSuccess(mcc_mnc, loadedData) {
      loadedData[mcc_mnc].forEach(function(app) {
        if (app.manifest) {
          singleVariantApps[app.manifest] = app;
        }
      });
    }

    function loadSVConfFileError(e) {
      singleVariantApps = {};
      console.error('Failed parsing singleVariant configuration file [' +
                    SINGLE_VARIANT_CONF_FILE + ']: ' + e);
    }

    var iccHandler = function(evt) {
      var mcc_mnc = getMccMnc();
      if (mcc_mnc) {
        load(SINGLE_VARIANT_CONF_FILE,
             loadSVConfFileSuccess.bind(undefined, mcc_mnc),
             loadSVConfFileError);
        IccHelper.removeEventListener('iccinfochange', iccHandler);
        return true;
      }
      return false;
    };

    if (!iccHandler()) { // Maybe we already have the mcc and mnc...
      IccHelper.addEventListener('iccinfochange', iccHandler);
    }
  }

  function startHomescreenByDefault() {
    var searchPage = document.querySelector('div[role="search-page"]');

    if (searchPage) {
      searchPage.parentNode.removeChild(searchPage);
    }

    if (Homescreen) {
      Homescreen.init(0);
    }
  }

  // Auto-initializing
  load('js/init.json', onLoadInitJSON, onErrorInitJSON);
  loadSingleVariantConf();

  return {
    getSection: function(section) {
      return conf[section];
    },

    getSingleVariantApps: function() {
      return singleVariantApps;
    },

    load: load
  };
}());
