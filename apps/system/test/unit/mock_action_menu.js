'use strict';

(function(exports) {
  function MockActionMenu(controller) {
    if (controller) {
      this.onselected = controller.successCb || function() {};
      this.oncancel = controller.cancelCb || function() {};
    }
  }

  MockActionMenu.prototype.show = function() {};
  MockActionMenu.prototype.hide = function() {};

  exports.MockActionMenu = MockActionMenu;
}(window));
