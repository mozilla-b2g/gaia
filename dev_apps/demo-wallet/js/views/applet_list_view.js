'use strict';

/* globals addMixin, ObserverSubjectMixin */
/* exported AppletListView */

(function(exports) {
  var AppletListView = function(id, data) {
    this._id = id;

    addMixin(this, ObserverSubjectMixin);
    this._render(data);
  };

  AppletListView.prototype = {
    _el: null,
    _id: null,
    _visible: false,

    _itemTemplate:
      '<p class="aid"></p><p>Lifecycle state: <span class="life"></span></p>' +
      '<p>Contactless state: <span class="contact"></span></p>',

    _render: function alv_render(data) {
      this._el = document.getElementById(this._id);
      this.updateList(data);
      this._visible = false;
    },

    get visible() {
      return this._visible;
    },

    set visible(value) {
      if (value) {
        this._visible = true;
        this._el.classList.remove('hide');
      } else {
        this._visible = false;
        this._el.classList.add('hide');
      }
    },

    updateList: function alv_updateList(data) {
      this._el.querySelector('.rtt').textContent = data.rtt;
      // need to create elements and add click handlers
      if(data.items && data.items.length) {
        var ul = this._el.getElementsByTagName('ul')[0];
        ul.innerHTML = '';
        data.items.forEach((item) => {
          var li = document.createElement('li');
          li.id = item.id;
          li.innerHTML = this._itemTemplate;
          li.className = 'active vbox';

          this.updateApplet(item, li);
          li.addEventListener('click', () => this._notify({ id: item.id }));
          ul.appendChild(li);
        });
      } else {
        console.log('no applets!');
      }
    },

    updateApplet: function alv_updateApplet(applet, li) {
      if(!li) {
        li = this._el.querySelector('#' + applet.id);
      }

      li.querySelector('.aid').textContent = applet.aid;
      li.querySelector('.life').textContent = applet.lifecycleState;
      li.querySelector('.contact').textContent = applet.contactlessState;
    },
  };

  exports.AppletListView = AppletListView;
}(window));