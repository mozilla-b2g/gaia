'use strict';

/* exported DetailsViewMixin */
(function(exports) {

  var DetailsViewMixin = {
    _id: null,
    _el: null,
    _visible: false,
    _template: '',

    initDetailsView: function(id, data) {
      this._id = id;
      this._el = document.querySelector('#' + this._id);
      this._el.innerHTML = this._template;

      if(data) {
        this._render(data);
      }
    },

    isVisible: function() {
      return this._visible;
    },

    show: function() {
      this._visible = true;
      this._el.classList.add(this._id+'-visible');
    },

    hide: function() {
      this._visible = false;
      this._el.classList.remove(this._id+'-visible');
    },

    _render: function(data) {},

    refreshView: function(data) {
      if(data) {
        this._render(data);
      }
    }
  };

  exports.DetailsViewMixin = DetailsViewMixin;
}((typeof exports === 'undefined') ? window : exports));
