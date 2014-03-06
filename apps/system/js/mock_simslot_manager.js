/* exported MockSIMSlotManager */
'use strict';
var MockSIMSlotManager = {
  ready: false,
  mInstances: [],
  getSlots: function mssm_getSlots() {
    return this.mInstances;
  },
  get length() {
    return this.mInstances.length;
  },
  isMultiSIM: function mssm_isMultiSIM() {
    return (this.mInstances.length > 1);
  },
  noSIMCardOnDevice: function() {},
  mTeardown: function mssm_mTeardown() {
    this.mInstances = [];
  }
};
