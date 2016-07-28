/* global IccHelper, verticalPreferences,
          VersionHelper, LazyLoader */
/* exported configurator */

'use strict';

(function(exports) {

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

  function loadSettingSIMPresent(currentMccMnc) {
    var settings = navigator.mozSettings;
    if (!settings) {
      console.log('Settings is not available');
      return;
    }
    var req = settings.createLock().get('ftu.simPresentOnFirstBoot');

    req.onsuccess = function osv_success(e) {
      var simOnFirstBoot = req.result['ftu.simPresentOnFirstBoot'];
      simPresentOnFirstBoot = !simOnFirstBoot ||
          req.result['ftu.simPresentOnFirstBoot'] === currentMccMnc;
    };

    req.onerror = function osv_error(e) {
      console.error('Error retrieving ftu.simPresentOnFirstBoot. ' + e);
    };
  }

  function loadSingleVariantConf() {
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
        loadSettingSIMPresent(mcc_mnc);
        singleVariantApps = {};
        if (loadedData && loadedData[mcc_mnc]) {
          loadedData[mcc_mnc].forEach(function(app) {
            if (app.manifestURL) {
              singleVariantApps[app.manifestURL] = app;
            } else if (app.id) {
              singleVariantApps[app.id] = app;
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
      if (e.name === 'NS_ERROR_FILE_NOT_FOUND') {
        console.log('No single variant configuration file found');
      } else {
        console.error('Failed parsing singleVariant configuration file [' +
                      SINGLE_VARIANT_CONF_FILE + ']: ', e);
      }
      dispatchSVReadyEvent();
    }

    var iccHandler = function(evt) {
      mcc_mnc = getMccMnc();
      if (mcc_mnc) {
        IccHelper.removeEventListener('iccinfochange', iccHandler);
        LazyLoader.getJSON(SINGLE_VARIANT_CONF_FILE).then(
          loadSVConfFileSuccess, loadSVConfFileError
        );
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

  function onLoadInitJSON(loadedData) {
    conf = loadedData;
    setupColumns();
    window.dispatchEvent(new CustomEvent('configuration-ready'));
    loadSingleVariantConf();
  }

  /**
   * Sets up the default columns.
   */
  function setupColumns() {
    var defaultCols = conf && conf.preferences &&
                          conf.preferences['grid.cols'] || undefined;

    if (defaultCols) {
      verticalPreferences.get('grid.cols').then(function(cols) {
        // Set the number of cols by default in preference's datastore
        !cols && verticalPreferences.put('grid.cols', defaultCols);
      });
    }
  }

  function onErrorInitJSON(e) {
    conf = {};
    console.error('Failed parsing homescreen configuration file:' + e);
    window.dispatchEvent(new CustomEvent('configuration-ready'));
    loadSingleVariantConf();
  }

  function handlerGridLayout(evt) {
    switch(evt.type) {
      case 'updated':
        if (evt.target.name === 'grid.layout') {
          verticalPreferences.removeEventListener('updated', handlerGridLayout);
          onLoadInitJSON(evt.target.value);
        }
        break;
    }
  }

  function load() {
    conf = {};

    VersionHelper.getVersionInfo().then(function(verInfo) {
      if (verInfo.isUpgrade()) {
        verticalPreferences.get('grid.layout').then(function(grid) {
          if (!grid) {
            verticalPreferences.addEventListener('updated', handlerGridLayout);
          } else {
            onLoadInitJSON(grid);
          }
        });
      } else {
        LazyLoader.getJSON('js/init.json').then(
          onLoadInitJSON, onErrorInitJSON
        );
      }
    }, function(err) {
      console.error('VersionHelper failed to lookup version settings, ' +
                    'asumming no version upgrade.\n');
    });
  }

  function Configurator() {
    load();
  }

  Configurator.prototype = {
    getSection: function(section) {
      return conf[section];
    },

    getGrid: function() {
      return conf.grid;
    },

    getItems: function(role) {
      var items = {};

      conf.grid.forEach(function forEachSection(section) {
        section.forEach(function forEachItem(item) {
          if (!item) {
            return;
          }
          if (item.role === role) {
            items[item.id] = item;
          }
        });
      });

      return items;
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

  exports.Configurator = Configurator;

}(window));
