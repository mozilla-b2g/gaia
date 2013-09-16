
'use strict';

var Configurator = (function() {
  var conf = {};

  // Path of the single variant configuration file
  var SINGLE_VARIANT_CONF_FILE = 'js/singlevariantconf.json';

  // Keeps the list of single variant apps, indexed by manifestURL
  var singleVariantApps = {};
  var simPresentOnFirstBoot = true;

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
        Homescreen.init(0, provider.init.bind(provider));
      } else {
        startHomescreenByDefault();
        setTimeout(provider.destroy, 0);
      }
    }
    loadSingleVariantConf();
  }

  function onErrorInitJSON(e) {
    conf = {};
    console.error('Failed parsing homescreen configuration file: ' + e);
    startHomescreenByDefault();
    loadSingleVariantConf();
  }

  function loadFile(file, successCallback, errorCallback) {

    try {
      var xhr = new XMLHttpRequest();
      xhr.overrideMimeType('application/json');
      xhr.open('GET', file, true);
      xhr.send(null);

      xhr.onload = function _xhrOnLoadFile(evt) {
        try {
          successCallback(JSON.parse(xhr.responseText));
        } catch (e) {
          errorCallback && errorCallback(e);
        }
      };

      xhr.onerror = function _xhrOnError(evt) {
        errorCallback && errorCallback('file not found');
      };
    } catch (ex) {
      errorCallback && errorCallback(ex);
    }
  }

  function load() {
    loadFile('js/init.json', onLoadInitJSON, onErrorInitJSON);
  }

  function loadSingleVariantConf() {
    loadSettingSIMPresent();
    if (!IccHelper || !IccHelper.enabled) {
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
      if (IccHelper.iccInfo) {
        var mcc = IccHelper.iccInfo.mcc;
        var mnc = IccHelper.iccInfo.mnc;
        if ((mcc !== undefined) && (mcc !== null) &&
            (mnc !== undefined) && (mnc !== null)) {
          return normalizeCode(mcc) + '-' + normalizeCode(mnc);
        }
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
    }

    var iccHandler = function(evt) {
      var mcc_mnc = getMccMnc();
      if (mcc_mnc) {
        loadFile(SINGLE_VARIANT_CONF_FILE,
                 loadSVConfFileSuccess.bind(undefined, mcc_mnc),
                 loadSVConfFileError);
        IccHelper.removeEventListener('iccinfochange', iccHandler);
        // No needed anymore
        IccHelper = iccHandler = null;
        return true;
      }
      return false;
    };

    if (!iccHandler()) { // Maybe we already have the mcc and mnc...
      IccHelper.addEventListener('iccinfochange', iccHandler);
    }
  }

  function loadSettingSIMPresent() {
    var settings = navigator.mozSettings;
    if (!settings) {
      console.log('Settings is not available');
      return;
    }
    var req = settings.createLock().get('ftu.simPresentOnFirstBoot');

    req.onsuccess = function osv_success(e) {
      simPresentOnFirstBoot =
          req.result['ftu.simPresentOnFirstBoot'] === undefined ||
          req.result['ftu.simPresentOnFirstBoot'];
    };

    req.onerror = function osv_error(e) {
      console.error('Error retrieving ftu.simPresentOnFirstBoot. ' + e);
    };
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
  load();

  return {
    getSection: function(section) {
      return conf[section];
    },

    getSingleVariantApps: function() {
      return singleVariantApps;
    },

    load: load,

    get isSimPresentOnFirstBoot() {
      return simPresentOnFirstBoot;
    },

    loadSettingSIMPresent: loadSettingSIMPresent
  };
}());
