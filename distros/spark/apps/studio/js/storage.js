/*global
  ThemeCreator
 */

(function(exports) {
  'use strict';

  exports.Storage = {
    fetchThemesList: function() {
      return getAllThemes().then(function(themes) {
        return themes.map(function(theme) {
          return {
            id: theme.id,
            title: theme.title
          };
        });
      });
    },

    fetchTheme: function(id) {
      return getTheme(id);
    },

    createTheme: function(theme) {
      return setTheme(theme);
    },

    forkTheme: function(theme, title) {
      delete theme.id;
      delete theme.manifestURL;
      theme.title = title;
      return setTheme(theme);
    },

    updateTheme: function(theme) {
      return setTheme(theme);
    },

    removeTheme: function(id) {
      return deleteTheme(id);
    }
  };

  // IDB private stuffs
  var defaults = [
    ThemeCreator.solarized('light'),
    ThemeCreator.solarized('dark')
  ];

  var database;
  function getDB() {
    return new Promise(function(resolve, reject) {
      if (database) {
        resolve(database);
        return;
      }

      var req = exports.indexedDB.open('Studio', 1);
      req.onerror = function(e) {
        reject(e.target.request.errorCode);
      };
      req.onsuccess = function(e) {
        database = e.target.result;
        resolve(database);
      };
      req.onupgradeneeded = function(e) {
        var db = e.target.result;
        var store = db.createObjectStore('themes', {
          keyPath:  'id',
          autoIncrement : true
        });
        for (var i = 0; i < defaults.length; i++) {
          store.put(defaults[i]);
        }
      };
    });
  }

  function getAllThemes() {
    return getDB().then(function(db) {
      return new Promise(function(resolve, reject) {
        var store = db.transaction('themes').objectStore('themes');

        var themes = [];
        var req = store.openCursor();
        req.onsuccess = function(e) {
          var cursor = e.target.result;
          if (cursor) {
            themes.push(cursor.value);
            cursor.continue();
          } else {
            resolve(themes);
          }
        };
        req.onerror = function(e) {
          reject(e.target.errorCode);
        };
      });
    });
  }

  function getTheme(id) {
    return getDB().then(function(db) {
      return new Promise(function(resolve, reject) {
        var req = db.transaction('themes').objectStore('themes').get(id);
        req.onsuccess = function(e) {
          resolve(e.target.result);
        };
        req.onerror = function(e) {
          reject(e.target.errorCode);
        };
      });
    });
  }

  function setTheme(theme) {
    return getDB().then(function(db) {
      return new Promise(function(resolve, reject) {
        var store = db.transaction('themes', 'readwrite').objectStore('themes');
        var req = store.put(theme);
        req.onsuccess = function(e) {
          resolve(e.target.result);
        };
        req.onerror = function(e) {
          reject(e.target.errorCode);
        };
      });
    });
  }

  function deleteTheme(id) {
    return getDB().then(function(db) {
      return new Promise(function(resolve, reject) {
        var store = db.transaction('themes', 'readwrite').objectStore('themes');
        var req = store.delete(id);
        req.onsuccess = function(e) {
          resolve(e.target.result);
        };
        req.onerror = function(e) {
          reject(e.target.errorCode);
        };
      });
    });
  }
})(window);
