'use strict';

(function(exports) {

  var MockSystemDialog = function SystemDialog(options) {
    if (options) {
      this.options = options;
    }
    this.instanceID = 'fake-dialog';
    var dialogFake = document.createElement('div');
    dialogFake.setAttribute('id', 'fake-dialog');
    this.element = dialogFake;
  };

  MockSystemDialog.prototype.show = function msd_show(reason) {
    this.onShow(reason);
  };

  MockSystemDialog.prototype.hide = function msd_hide(reason) {
    this.onHide(reason);
  };

  MockSystemDialog.prototype.onShow = function msd_onShow(reason) {
    if (typeof(this.options.onShow) == 'function') {
      this.options.onShow(reason);
    }
  };

  MockSystemDialog.prototype.onHide = function msd_onHide(reason) {
    if (typeof(this.options.onHide) == 'function') {
      this.options.onHide(reason);
    }
  };

  MockSystemDialog.prototype.resize =
  MockSystemDialog.prototype.updateHeight =
  function() {};

  exports.MockSystemDialog = MockSystemDialog;
})(window);
