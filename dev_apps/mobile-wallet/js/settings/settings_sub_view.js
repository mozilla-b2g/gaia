'use strict';

/* exported SettingsSubView */

(function(exports) {
  var SettingsSubView = function(id, onCloseCb) {
    this._id = id;
    this._onCloseCallback = onCloseCb;
    this._el = document.querySelector('#'+id);
    this._el.querySelector('header button.icon-back')
    .addEventListener('click', () => {
      this.visible = false;
      if(this._onCloseCallback) {
        this._onCloseCallback();
      }
    });
  };

  SettingsSubView.prototype = {
    _el: null,
    _id: null,
    _visible: false,

    _onCloseCallback: null,

    get visible() {
      return this._visible;
    },

    set visible(value) {
      if(value) {
        this._visible = true;
        this._el.classList.add('slide-in');
      } else {
        this._visible = false;
        this._el.classList.remove('slide-in');
      }
    },

    set content(el) {
      var contentEl = this._el.querySelector('.subview-content');
      this._el.replaceChild(el, contentEl);
      el.classList.add('subview-content');
    },
  };

  exports.SettingsSubView = SettingsSubView;

}((typeof exports === 'undefined') ? window : exports));
