'use strict';

(function(exports) {
  var instanceCounter = 0;

  var MockImeMenu = function(listItems, title, successCb, cancelCb) {
    this.onselected = successCb || function() {};
    this.oncancel = cancelCb || function() {};
    this.listItems = listItems;
    this.title = title;

    this.instanceId = instanceCounter;

    MockImeMenu.instances[instanceCounter] = this;

    instanceCounter++;

    return this;
  };

  MockImeMenu.instances = [];

  MockImeMenu.mSetup = function () {
    MockImeMenu.instances = [];
    instanceCounter = 0;
  };

  MockImeMenu.prototype = {
    start: function mim_start() {
    },

    mTeardown: function mim_mTeardown() {
      this.onselected = undefined;
      this.oncancel = undefined;
      this.listItems = undefined;
      this.title = undefined;

      MockImeMenu.instances[this.instanceId] = null;
    }
  };

  exports.MockImeMenu = MockImeMenu;
}(window));
