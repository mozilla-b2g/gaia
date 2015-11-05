/* global BaseModule, LazyLoader, BookmarksDatabase */
'use strict';

(function(exports) {

  var PinsManager = function() {};
  PinsManager.SERVICES = ['isPinned'];
  PinsManager.STATES = ['getScope'];

  BaseModule.create(PinsManager, {
    EVENT_PREFIX: 'pins-',
    DEBUG: false,
    name: 'PinsManager',
    _scopes: {},

    _start: function() {
      LazyLoader.load('shared/js/bookmarks_database.js')
        .then(function() {
          this._syncScopes();
          this._addListeners();
        }.bind(this));
    },

    isPinned: function(url) {
      var origin = new URL(url).origin;
      var scopes = this._scopes[origin];

      if (!scopes) {
        return false;
      }

      return Object.keys(scopes).some(function(scope) {
        return this._inScope(url, scope);
      }.bind(this));
    },

    getScope: function(url) {
      var origin = new URL(url).origin;
      var paths = this._scopes[origin];

      if (!paths) {
        return;
      }

      var scopes = [];

      for (var path in paths) {
        var scope = paths[path].scope;
        if (this._inScope(url, scope)) {
          scopes.push(scope);
        }
      }

      return scopes.length && this._getLongestScope(scopes);
    },

    _inScope: function(url, scope) {
      if (!scope) {
        return false;
      }

      var origin = new URL(url).origin;
      var scopeFullUrl = new URL(scope, origin);
      return url.indexOf(scopeFullUrl) === 0;
    },

    _getLongestScope: function(scopes) {
      return scopes.reduce(function(a, b) {
        return a.length > b.length ? a : b;
      });
    },

    _addListeners: function() {
      var events = ['added', 'updated', 'removed'];
      events.forEach(function(name) {
        BookmarksDatabase.addEventListener(name, this._onChange.bind(this));
      }.bind(this));
    },

    _onChange: function(task) {
      switch (task.type) {
        case 'updated':
        case 'added':
          this._addScope(task.target);
          break;

        case 'removed':
          this._removeScope(task.target.id);
          break;
      }
    },

    _syncScopes: function() {
      var self = this;
      self._scopes = {};
      BookmarksDatabase.getAll().then(function(bookmarks) {
        Object.keys(bookmarks).forEach(function(id) {
          var currentBookmark = bookmarks[id];
          self._addScope(currentBookmark);
        });
      });
    },

    _addScope: function(data) {
      var url = new URL(data.id);
      var origin = url.origin;
      this._scopes[origin] = this._scopes[origin] || {};

      var path = data.scope || '/';
      this._scopes[origin][path] = {
        id: data.id,
        name: data.name,
        scope: data.scope
      };
      this.publish('scopechange', {
        action: 'add',
        scope: data.scope || false,
        name: data.name,
        url: data.id
      });
    },

    _removeScope: function(id) {
      var url = new URL(id);
      var origin = url.origin;
      if (this._scopes[origin]) {
        var currentHost = this._scopes[origin];
        var removed;
        Object.keys(currentHost).forEach(function(path) {
          if (currentHost[path].id === id) {
            removed = currentHost[path];
            delete currentHost[path];
          }
        });
        if (removed) {
          this.publish('scopechange', {
            action: 'remove',
            scope: removed.scope || false,
            name: removed.name,
            url: removed.id
          });
        }
      }
    }
  });

}(window));
