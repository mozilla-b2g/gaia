'use strict';

(function(exports) {

  var MockSimPinSystemDialog = function SimPinSystemDialog(options) {
    if (options) {
      this.options = options;
    }
    this.instanceID = 'fake-simdialog';
    var dialogFake = document.createElement('div');
    dialogFake.setAttribute('id', 'fake-simpin-dialog');
    this.element = dialogFake;
  };

  MockSimPinSystemDialog.prototype.show = function msd_show(reason) {
    this.onShow(reason);
  };

  MockSimPinSystemDialog.prototype.hide = function msd_hide(reason) {
    this.onHide(reason);
  };

  MockSimPinSystemDialog.prototype.onShow = function msd_onShow(reason) {
    if (typeof(this.options.onShow) == 'function') {
      this.options.onShow(reason);
    }
  };

  MockSimPinSystemDialog.prototype.onHide = function msd_onHide(reason) {
    if (typeof(this.options.onHide) == 'function') {
      this.options.onHide(reason);
    }
  };

  MockSimPinSystemDialog.prototype.resize =
  MockSimPinSystemDialog.prototype.updateHeight =
  function() {};

  exports.MockSimPinSystemDialog = MockSimPinSystemDialog;
})(window);
