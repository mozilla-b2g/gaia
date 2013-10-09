var MockIccHelper = {
  mCardState: 'ready',

  addEventListener: function icch_addEventListener(event, handler) {},

  get enabled() {
    return true;
  },

  get cardState() {
    return this.mCardState;
  }
};
