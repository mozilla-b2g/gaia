var MockIccHelper = {
  mCardState: 'ready',

  addEventListener: function icch_addEventListener(event, handler) {},

  get cardState() {
    return this.mCardState;
  }
};
