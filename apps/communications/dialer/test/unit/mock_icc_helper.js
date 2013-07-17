var MockIccHelper = {
  addEventListener: function icch_addEventListener(event, handler) {},

  get enabled() {
    return true;
  },

  get cardState() {
    return 'ready';
  }
};
