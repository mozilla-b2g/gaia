'use strict';

(function(exports) {
  function MockSimPinDialog() {}

  MockSimPinDialog.prototype.show = function() {};

  MockSimPinDialog.prototype.visible = false;
  exports.MockSimPinDialog = MockSimPinDialog;
}(window));
