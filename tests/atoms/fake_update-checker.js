/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

let Cc = Components.classes;
let Ci = Components.interfaces;
let Cu = Components.utils;
let Cm = Components.manager.QueryInterface(Ci.nsIComponentRegistrar);

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');

function GaiaUITests_FakeUpdateChecker() {
  function debug(str) {
    dump('FakeUpdateChecker: ' + str + '\n');
  }

  /**
   * FakeUpdateChecker
   * Mocking Checks for new Updates
   * @constructor
   */
  function FakeUpdateChecker() {
    debug('Creating');
  }

  FakeUpdateChecker.prototype = {
    /**
     * The URL of the update service XML file to connect to that contains details
     * about available updates.
     */
    getUpdateURL: function(force) {
      debug('getUpdateURL - update URL: ' + force);
      return '';
    },

    /**
     * See nsIUpdateService.idl
     */
    checkForUpdates: function(listener, force) {
      debug('checkForUpdates, force: ' + force);
      listener.onCheckComplete({}, [], 0);
      return;
    },

    /**
     * See nsIUpdateService.idl
     */
    stopChecking: function(duration) {
      debug('stopChecking, duration: ' + duration);
      return;
    },

    classID: newCheckerClassID,
    QueryInterface:
      XPCOMUtils.generateQI([Ci.nsIUpdateChecker])
  };

  function FakeUpdateTimer() {
    debug('Creating timer');
  }

  FakeUpdateTimer.prototype = {
    /**
     * nsITimerCallback
     */
    notify: function(aTimer) {
      debug('notify');
    },

    classID: newTimerClassID,
    QueryInterface: XPCOMUtils.generateQI([Ci.nsITimerCallback])
  };

  // Unregister the embedded low level component for update checker and
  // replace it with our own.
  function replaceClass(contract, expected, newCid, className) {
    // Unregister the old factory.
    let oldCid = "";
    try {
      oldCid = Cm.contractIDToCID(contract);
    } catch (ex) {
      // Might fail if not yet registered
    }

    let replace = (oldCid == expected);
    debug('Old class: ' + oldCid);
    if (replace) {
      debug('Starting replacement of ' + contract);
      let instance = null;
      let newFactory = {
        createInstance: function(outer, iid) {
          if (outer) {
            throw Components.results.NS_ERROR_NO_AGGREGATION;
	  }
          if (instance === null) {
            instance = new className();
	  }
          instance.QueryInterface(iid);
          return instance.QueryInterface(iid);
        },
        lockFactory: function(aLock) {
          throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
        },
        QueryInterface: XPCOMUtils.generateQI([Ci.nsIFactory])
      };

      let oldFactory =
        Cm.getClassObjectByContractID(contract, Ci.nsIFactory);
      Cm.unregisterFactory(oldCid, oldFactory);
      Cm.registerFactory(newCid, '', contract, newFactory);
    }
  }

  debug('Initiating update-checker service replacement');

  let newCheckerClassID = Cc['@mozilla.org/uuid-generator;1']
                     .getService(Ci.nsIUUIDGenerator)
                     .generateUUID();
  let updateCheckerContract = '@mozilla.org/updates/update-checker;1';
  let checkerCid = '{898cdc9b-e43f-422f-9cc4-2f6291b415a3}';
  debug('Generated a new checker class ID: ' + newCheckerClassID);

  let newTimerClassID = Cc['@mozilla.org/uuid-generator;1']
                     .getService(Ci.nsIUUIDGenerator)
                     .generateUUID();
  let updateTimerContract = '@mozilla.org/b2g/webapps-update-timer;1';
  let timerCid = '{637b0f77-2429-49a0-915f-abf5d0db8b9a}';
  debug('Generated a new timer class ID: ' + newTimerClassID);

  replaceClass(
    updateCheckerContract, checkerCid, newCheckerClassID, FakeUpdateChecker);
  replaceClass(
    updateTimerContract, timerCid, newTimerClassID, FakeUpdateTimer);
}
