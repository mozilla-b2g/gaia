(function(window) {
  var screenElement = document.getElementById('screen');
  window.SheetTransitionMixin = {
    _enter_swipein: function __enter_swipein() {
     this.setVisible(true);
     this.publish('opened');

     screenElement.classList.toggle('fullscreenapp', this.isFullScreen());
    },

    _enter_swipeout: function __enter_swipeout() {
      this.publish('closed');
    }
  };

  AppWindow.addMixin(SheetTransitionMixin);
}(this));
