(function(window) {
  var LayoutManager = {
    get windowHeight() {
      return window.innerHeight -
              StatusBar.height -
              SoftwareButtonManager.height -
              KeyboardManager.getHeight();
    },

    get windowWidth() {
      return window.innerWidth;
    },

    get fullscreenHeight() {
      return window.innerHeight - KeyboardManager.getHeight() -
              SoftwareButtonManager.height;
    }
  };

  window.LayoutManager = LayoutManager;
}(this));
