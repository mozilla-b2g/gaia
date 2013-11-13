(function(window) {
  window.SheetTransitionMixin = {
    _enter_swipein: function __enter_swipein() {
      this.debug('ENTER: swipein state');
      this.publish('opened');
    },

    _enter_swipeout: function __enter_swipeout() {
      this.debug('ENTER: swipeout state');
      this.publish('closed');
    }
  };

  AppWindow.addMixin(SheetTransitionMixin);
}(this));
