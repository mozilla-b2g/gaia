/* exported MockSIMSlotManager */
'use strict';
var MockSIMSlotManager = {
  ready: false,
  mInstances: [],
  get: function mssm_get(index) {
    return this.mInstances[index];
  },
  getSlots: function mssm_getSlots() {
    return this.mInstances;
  },
  get length() {
    return this.mInstances.length;
  },
  isMultiSIM: function mssm_isMultiSIM() {
    return (this.mInstances.length > 1);
  },
  isSIMCardAbsent: function mssm_isSIMCardAbsent(i) {
    return this.mInstances[i].isAbsent();
  },
  hasOnlyOneSIMCardDetected: function() {},
  noSIMCardOnDevice: function() {},
  noSIMCardConnectedToNetwork: function() {},
  mTeardown: function mssm_mTeardown() {
    this.mInstances = [];
  }
};
