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

  window.addEventListener('mozChromeEvent', this);
};

DynamicInputRegistry.prototype.stop = function() {
  this.taskQueue = null;

  window.removeEventListener('mozChromeEvent', this);
};

DynamicInputRegistry.prototype.handleEvent = function(evt) {
  var detail = evt.detail;

  if (!detail.type.startsWith('inputregistry')) {
    return;
  }

  this.taskQueue = this.taskQueue.then(function() {
    return KeyboardHelper.inputAppList.getList();
  }).then(function(inputApps) {
    var inputApp = (inputApps.filter(function(inputApp) {
      return (inputApp.domApp.manifestURL === detail.manifestURL);
    }) || [])[0];

    if (!inputApp) {
      this._sendContentEvent(detail, 'App not installed');
      return;
    }

    var currentInputs = inputApp.getInputs();
    var currentInputIds = Object.keys(currentInputs);
    if (currentInputIds.indexOf(detail.inputId) !== -1 &&
        !currentInputs[detail.inputId].isDynamic) {
      this._sendContentEvent(detail,
        'Can\'t mutate a statically declared input.');
      return;
    }

    return this._updateSetting(detail).then(function() {
      this._sendContentEvent(detail);
    }.bind(this), function(e) {
      console.error(e);
      this._sendContentEvent(detail, 'Error updating input.');
    }.bind(this));
  }.bind(this)).catch(function(e) { console.error(e); });
};

DynamicInputRegistry.prototype._updateSetting = function(detail) {
  if (!navigator.mozSettings) {
    throw 'DynamicInputRegistry: No mozSettings?';
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
      switch (detail.type) {
        case 'inputregistry-add':
          if (!(detail.manifestURL in dynamicInputs)) {
            dynamicInputs[detail.manifestURL] = {};
          }
          dynamicInputs[detail.manifestURL][detail.inputId] =
            detail.inputManifest;
          break;

        case 'inputregistry-remove':
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

DynamicInputRegistry.prototype._sendContentEvent = function(chromeDetail, err) {
  var detail = {
    type: chromeDetail.type,
    id: chromeDetail.id
  };

  if (err) {
    detail.error = err;
  }

  window.dispatchEvent(new CustomEvent('mozContentEvent', { detail: detail }));
};

exports.DynamicInputRegistry = DynamicInputRegistry;

})(window);
