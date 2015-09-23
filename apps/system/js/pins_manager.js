/* global BaseModule, LazyLoader, BookmarksDatabase */
'use strict';

(function(exports) {

  var PinsManager = function() {};
  PinsManager.SERVICES = ['isPinned'];

  BaseModule.create(PinsManager, {
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
      var hostname = new URL(url).hostname;
      var scopes = this._scopes[hostname];

      if (!scopes) {
        return false;
      }

      return Object.keys(scopes).some(function(scope) {
        return url.indexOf(scope) === 0;
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
      var hostname = url.hostname;
      this._scopes[hostname] = this._scopes[hostname] || {};

      var scope = data.scope || data.id.replace(url.pathname, '');
      this._scopes[hostname][scope] = data.id;
    },

    _removeScope: function(id) {
      var url = new URL(id);
      var hostname = url.hostname;
      if (this._scopes[hostname]) {
        var currentHost = this._scopes[hostname];
        Object.keys(currentHost).forEach(function(scope) {
          if (currentHost[scope] === id) {
            delete currentHost[scope];
          }
        });
      }
    }
  });

}(window));
