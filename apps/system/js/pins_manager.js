/* global BaseModule, LazyLoader, BookmarksDatabase */
'use strict';

(function(exports) {

  var PinsManager = function() {};
  PinsManager.SERVICES = ['isPinned'];

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
      console.log('PinsManager, isPinned? ', url);
      var origin = new URL(url).origin;
      var scopes = this._scopes[origin];

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
      console.log('PinsManager, _onChnage: ', task);
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
      console.log('PinsManager, _addScope ', data, origin);
      this._scopes[origin] = this._scopes[origin] || {};

      var scope = data.scope || data.origin;
      this._scopes[origin][scope] = data.id;
      this.publish('scopechange', { action: 'add', scope: scope });
    },

    _removeScope: function(id) {
      var url = new URL(id);
      var origin = url.origin;
      if (this._scopes[origin]) {
        var currentHost = this._scopes[origin];
        var removedScope;
        Object.keys(currentHost).forEach(function(scope) {
          if (currentHost[scope] === id) {
            delete currentHost[scope];
            removedScope = scope;
          }
        });
        if (removedScope) {
          this.publish('scopechange',
                      { action: 'remove', scope: removedScope });
        }
      }
    }
  });

}(window));
