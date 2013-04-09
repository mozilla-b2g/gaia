!function() {

  var down = {};

  /**
   * Handle keydown special cases
   */
  window.addEventListener('keypress', function(e) {
    if (e.keyCode == 36) {
      if (down[e.keyCode]) { return }

      down[e.keyCode] = true;

      FFOS_RUNTIME.sendFrameEvent({
        type: 'home-button-press'
      });
    }
  });

  /**
   * Handle keyup special cases
   */
  window.addEventListener('keyup', function(e) {
    if (e.keyCode == 36) {

      delete down[e.keyCode];

      FFOS_RUNTIME.sendFrameEvent({
        type: 'home-button-release'
      });
    }
  });
}();
