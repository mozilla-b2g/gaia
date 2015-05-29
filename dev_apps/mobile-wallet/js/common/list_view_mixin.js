'use strict';

/* globals CARD_UNKNOWN */
/* exported ListViewMixin */

(function(exports) {

  var ListViewMixin = {
    _id: null,
    _el: null,
    _visible: false,

    _imgMap: null,

    _itemTemplate:
      '<div class="listview-element-pocket">' +
        '<div class="listview-element-sew"></div>' +
      '</div>' +
      '<img class="listview-element-img" src="img/cards/unknown.png">',

    initListView: function(id, imgMap, data) {
      this._id = id;
      this._el = document.querySelector('#' + this._id);

      this._imgMap = imgMap;

      if(data && data.length) {
        this._render(data);
      }
    },

    updateList(listItems) {
      if(!Array.isArray(listItems) || !listItems.length) {
        this.debug('list without elements', listItems);
        this._renderEmpty();
        return;
      }

      this._render(listItems);
    },

    isVisible: function() {
      return this._visible;
    },

    show: function() {
      this._visible = true;
      this._el.classList.remove('listview-hide');
    },

    hide: function() {
      this._visible = false;
      this._el.classList.add('listview-hide');
    },

    _render: function(data){
      var emptyLi = document.createElement('li');
      emptyLi.innerHTML = this._itemTemplate;
      var ulFragment = document.createDocumentFragment();
      data.forEach((item) => {
        var li = emptyLi.cloneNode(true);
        li.id = item.id;

        var src = this._imgMap(item.imgId);
        // TODO remove CARD_UNKNOW dependency here
        li.querySelector('img').src = src ? src : CARD_UNKNOWN;

        ulFragment.appendChild(li);
      });

      var ul = this._el.querySelector('ul');
      ul.innerHTML =  '';
      ul.appendChild(ulFragment);
    },

    _renderEmpty: function() {
      var emptyLi = document.createElement('li');
      emptyLi.innerHTML = this._itemTemplate;

      var ul = this._el.querySelector('ul');
      ul.innerHTML =  '';
      ul.appendChild(emptyLi);
    },
  };

  exports.ListViewMixin = ListViewMixin;
}((typeof exports === 'undefined') ? window : exports));
