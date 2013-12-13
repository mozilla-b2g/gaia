var MockSIMSlotManager = {
  mInstances: [],
  getSlots: function mssm_getSlots() {
    return this.mInstances;
  },
  length: 0,
  isMultiSIM: function mssm_isMultiSIM() {
    return (this.mInstances.length > 1);
  },
  noSIMCardOnDevice: function() {},
  mTeardown: function mssm_mTeardown() {
    this.mInstances = [];
    this.length = 0;
  }
};
