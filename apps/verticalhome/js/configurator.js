/* global app, IccHelper */
/* exported configurator */

'use strict';

var configurator = (function() {

  // We're going to use the mcc_mnc as a semaphore as well as to store its
  // value during the singleVariant file's processing time.
  var mcc_mnc;

  // Globar configuration
  var conf = {};

  // Path of the single variant configuration file
  var SINGLE_VARIANT_CONF_FILE = 'js/singlevariantconf.json';

  // Keeps the list of single variant apps, indexed by manifestURL
  var singleVariantApps = {};
  var simPresentOnFirstBoot = true;

  var gaiaGridLayoutReady = false;

  function loadFile(file, success, error) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.overrideMimeType('application/json');
      xhr.open('GET', file, true);

      xhr.onload = function _xhrOnLoadFile(evt) {
        try {
          success(JSON.parse(xhr.responseText));
        } catch (e) {
          error && error(e);
        }
      };

      xhr.onerror = function _xhrOnError(evt) {
        error && error('file ' + file + ' not found');
      };
      xhr.send(null);
    } catch (ex) {
      error && error(ex);
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

  function loadSingleVariantConf() {
    loadSettingSIMPresent();
    if (!IccHelper) {
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

    function dispatchSVReadyEvent() {
      mcc_mnc = undefined;
      window.dispatchEvent(new CustomEvent('singlevariant-ready'));
    }

    function loadSVConfFileSuccess(loadedData) {
      try {
        singleVariantApps = {};
        if (loadedData && loadedData[mcc_mnc]) {
          loadedData[mcc_mnc].forEach(function(app) {
            if (app.manifestURL) {
              singleVariantApps[app.manifestURL] = app;
            }
          });
        } else {
          console.log('There is not singleVariant configuration for ' +
                      mcc_mnc);
        }
      } catch (e) {
        console.error('There was an error loading singleVariant configuration',
                      e);
      } finally {
        dispatchSVReadyEvent();
      }
    }

    function loadSVConfFileError(e) {
      singleVariantApps = {};
      console.error('Failed parsing singleVariant configuration file [' +
                    SINGLE_VARIANT_CONF_FILE + ']: ', e);
      dispatchSVReadyEvent();
    }

    var iccHandler = function(evt) {
      mcc_mnc = getMccMnc();
      if (mcc_mnc) {
        IccHelper.removeEventListener('iccinfochange', iccHandler);
        loadFile(SINGLE_VARIANT_CONF_FILE,
                 loadSVConfFileSuccess,
                 loadSVConfFileError);
        // No needed anymore
        iccHandler = null;
        return true;
      }
      return false;
    };

    if (!iccHandler()) { // Maybe we already have the mcc and mnc...
      IccHelper.addEventListener('iccinfochange', iccHandler);
    }
  }

  var gridLayoutReady = function(evt) {
    window.removeEventListener('gaiagrid-layout-ready', gridLayoutReady);
    app.init();
  };

  function onLoadInitJSON(loadedData) {
    conf = loadedData;
    if (!gaiaGridLayoutReady) {
      window.removeEventListener('gaiagrid-layout-ready', globalHandleEvent);
      window.addEventListener('gaiagrid-layout-ready', gridLayoutReady);
    } else {
      app.init();
    }
    loadSingleVariantConf();
  }

  function onErrorInitJSON(e) {
    conf = {};
    console.error('Failed parsing homescreen configuration file:' + e);
    if (!gaiaGridLayoutReady) {
      window.removeEventListener('gaiagrid-layout-ready', globalHandleEvent);
      window.addEventListener('gaiagrid-layout-ready', gridLayoutReady);
    } else {
      app.init();
    }
    loadSingleVariantConf();
  }

  /**
   * General event handler.
   */
  var globalHandleEvent = function(e) {
    switch(e.type) {
      case 'gaiagrid-layout-ready':
      gaiaGridLayoutReady = true;
      window.removeEventListener('gaiagrid-layout-ready', globalHandleEvent);
      break;
    }
  };

  function load() {
    window.addEventListener('gaiagrid-layout-ready', globalHandleEvent);
    loadFile('js/init.json', onLoadInitJSON, onErrorInitJSON);
  }

  load();

  return {
    getSection: function(section) {
      return conf[section];
    },

    getGrid: function() {
      return conf.grid;
    },

    getSingleVariantApp: function(manifestURL) {
      if (manifestURL in singleVariantApps) {
        var svApp = singleVariantApps[manifestURL];
        if (svApp.location !== undefined) {
          return svApp;
        }
      }
    },

    get isSingleVariantReady() {
      return !mcc_mnc;
    },

    load: load,

    get isSimPresentOnFirstBoot() {
      return simPresentOnFirstBoot;
    },

    loadSettingSIMPresent: loadSettingSIMPresent
  };

}());
