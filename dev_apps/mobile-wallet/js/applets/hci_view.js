'use strict';

/* exported HCIView */

(function(exports) {

  const CLOSE_TIMEOUT = 1000;

  var HCIView = function(id, imgSrc) {
    this._el = document.querySelector('#'+id);
    this._imgSrc = imgSrc;
  };

  HCIView.prototype = {
    _el: null,
    _imgSrc: null,
    _clickHandler: null,

    show: function show(aid, closeApp) {
      window.navigator.vibrate([50, 50, 50]);

      this._el.querySelector('#hci-image').src = this._imgSrc(aid);
      this._el.querySelector('#hci-number').textContent = aid;

      this._clickHandler = () => this._dismiss(closeApp);
      this._el.addEventListener('click', this._clickHandler);
      this._el.classList.add('show');
    },

    _dismiss: function _dismiss(closeApp) {
      if(closeApp) {
        setTimeout(() => window.close(), CLOSE_TIMEOUT);
        return;
      }

      this._el.classList.remove('show');
      this._el.removeEventListener('click', this._clickHandler);
    },

  };

  exports.HCIView = HCIView;
}((typeof exports === 'undefined') ? window : exports));