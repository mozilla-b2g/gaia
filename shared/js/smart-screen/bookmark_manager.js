/* global CardStore, evt */

(function(exports) {
  'use strict';

  var BookmarkManager = evt({
    TABLE_NAME: 'appdeck_bookmarks',

    init: function bm_init(ownerURL, mode) {
      this._store = new CardStore(this.TABLE_NAME, mode, ownerURL);
      this._store.on('change', this.fire.bind(this, 'change'));
    },

    iterate: function bm_iterate(cb) {
      return this._store.iterateData(cb);
    },

    add: function bm_add(entry, id) {
      if (!id) {
        id = entry.url;
      }

      entry.date = new Date();
      if (entry.iconUrl) {
        return this.fetchIcon(entry.iconUrl).then(iconData => {
          entry.icon = iconData;
          delete entry.iconUrl;
          return this._store.addData(entry, id);
        }).catch(() => {
          return this._store.addData(entry, id);
        });
      } else {
        return this._store.addData(entry, id);
      }
    },

    remove: function bm_remove(id) {
      return this._store.removeData(id);
    },

    get: function bm_get(id) {
      return this._store.getData(id);
    },

    set: function bm_set(id, entry) {
      entry.date = new Date();
      if (entry.iconUrl) {
        return this.fetchIcon(entry.iconUrl).then(iconData => {
          entry.icon = iconData;
          delete entry.iconUrl;
          return this._store.saveData(id, entry);
        }).catch(() => {
          return this._store.saveData(id, entry);
        });
      } else {
        return this._store.saveData(id, entry);
      }
    },

    fetchIcon: function bm_fetchIcon(url) {
      return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest({mozSystem: true});
        xhr.open('GET', url);
        xhr.responseType = 'blob';
        xhr.send();

        xhr.onload = function() {
          resolve(xhr.response);
        };

        xhr.onerror = function() {
          console.warn('Unable to retrive icon data. Leaving icon empty.');
          reject();
        };
      });
    },

    getLength: function bm_getLength() {
      return this._store.getLength();
    }
  });

  exports.BookmarkManager = BookmarkManager;
}(window));

