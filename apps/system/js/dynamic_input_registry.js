'use strict';

/* global KeyboardHelper */

/**
 * DynamicInputRegistry takes mozChromeEvent, check it, and save/remove the
 * dynamic input definition to mozSettings.
 *
 * InputAppListSettings will then pick up the change in mozSettings and update
 * the available layouts to all apps -- we do not communicate to it directly
 * here.
 */
(function(exports) {

var DynamicInputRegistry = function() {
  this.taskQueue = null;
};

DynamicInputRegistry.prototype.SETTING_KEY = 'keyboard.dynamic-inputs';

DynamicInputRegistry.prototype.start = function() {
  this.taskQueue = Promise.resolve();

  navigator.mozInputMethod.mgmt.addEventListener('addinputrequest', this);
  navigator.mozInputMethod.mgmt.addEventListener('removeinputrequest', this);
};

DynamicInputRegistry.prototype.stop = function() {
  this.taskQueue = null;

  navigator.mozInputMethod.mgmt.removeEventListener('addinputrequest', this);
  navigator.mozInputMethod.mgmt.removeEventListener('removeinputrequest', this);
};

DynamicInputRegistry.prototype.handleEvent = function(evt) {
  var detail = evt.detail;

  var p = this.taskQueue.then(function() {
    return KeyboardHelper.inputAppList.getList();
  }).then(function(inputApps) {
    var inputApp = (inputApps.filter(function(inputApp) {
      return (inputApp.domApp.manifestURL === detail.manifestURL);
    }) || [])[0];

    if (!inputApp) {
      throw 'App not installed';
    }

    var currentInputs = inputApp.getInputs();
    var currentInputIds = Object.keys(currentInputs);
    if (currentInputIds.indexOf(detail.inputId) !== -1 &&
        !currentInputs[detail.inputId].isDynamic) {
      throw 'Can\'t mutate a statically declared input.';
    }

    return this._updateSetting(evt.type, detail)
      .catch(function(e) {
        console.error(e);
        throw 'Error updating input.';
      }.bind(this));
  }.bind(this));

  // Push the Promise queue to Gecko so it would respond to app accordingly.
  detail.waitUntil(p);

  // Tell Gecko this event is handled
  evt.preventDefault();

  this.taskQueue = p
    .catch(function(e) {
      console.error('DynamicInputRegistry rejects', e);
    });
};

DynamicInputRegistry.prototype._updateSetting = function(evtType, detail) {
  if (!navigator.mozSettings) {
    throw new Error('DynamicInputRegistry: No mozSettings?');
  }

  // We must mutate the setting with the same lock there.
  // As much as I want to use Promise interface, chainning callbacks in
  // DOMRequest#then does not keep the lock (transaction) alive;
  // we therefore have to work with EventTarget interface directly.
  return new Promise(function(resolve, reject) {
    var lock = navigator.mozSettings.createLock();
    var getReq = lock.get(this.SETTING_KEY);
    getReq.onerror = function() { reject(getReq.error); };
    getReq.onsuccess = (function() {
      var dynamicInputs = getReq.result[this.SETTING_KEY] || {};
      switch (evtType) {
        case 'addinputrequest':
          if (!(detail.manifestURL in dynamicInputs)) {
            dynamicInputs[detail.manifestURL] = {};
          }
          dynamicInputs[detail.manifestURL][detail.inputId] =
            detail.inputManifest;
          break;

        case 'removeinputrequest':
          if (!(detail.manifestURL in dynamicInputs)) {
            break;
          }
          delete dynamicInputs[detail.manifestURL][detail.inputId];
          if (Object.keys(dynamicInputs[detail.manifestURL]).length === 0) {
            delete dynamicInputs[detail.manifestURL];
          }

          break;
      }

      var toSet = {};
      toSet[this.SETTING_KEY] = dynamicInputs;

      var setReq = lock.set(toSet);
      setReq.onerror = function() { reject(setReq.error); };
      setReq.onsuccess = function() { resolve(); };
    }).bind(this);
  }.bind(this));
};

exports.DynamicInputRegistry = DynamicInputRegistry;

})(window);
