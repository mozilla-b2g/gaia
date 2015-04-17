'use strict';

(function(exports) {
  /* exported MockContextMenuView */
  function MockContextMenuView(app) {
    this._shown = false;
  }

  MockContextMenuView.prototype.show = function() {
    this._shown = true;
  };

  MockContextMenuView.prototype.isShown = function() {
    return this._shown;
  };

  MockContextMenuView.prototype.hide = function(evt) {
    this._shown = false;
  };

  exports.MockContextMenuView = MockContextMenuView;
})(window);
