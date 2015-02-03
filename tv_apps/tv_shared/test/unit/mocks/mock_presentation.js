/* globals MockPresentationSession */
(function(exports) {
  'use strict';

  // Mock API from http://bit.ly/15wfAtX
  var MockPresentation = {
    _mEventHandlers: {
      'available': [],
      'sessionready': []
    },

    startSession: function(url, sessionId) {
      var session = MockPresentationSession._mCreateSession();
      session._state = true;
      return Promise.resolve(session);
    },

    joinSession: function(url, sessionId) {
    },

    session: undefined,

    _onsessionready: undefined,

    set onsessionready (handler) {
      if (typeof handler === 'function') {
        this._onsessionready = handler;
      }
    },

    _onavailable: undefined,

    set onavailable (handler) {
      if (typeof handler === 'function') {
        this._onavailable = handler;
      }
    },

    available: false,

    addEventListener: function(eventName, handler) {
      if (this._mEventHandlers[eventName] && typeof handler === 'function') {
        this._mEventHandlers[eventName].push(handler);
      }
    },

    removeEventListener: function(eventName, handler) {
      if (this._mEventHandlers[eventName]) {
        var index = this._mEventHandlers[eventName].indexOf(handler);
        if (index >= 0) {
          this._mEventHandlers[eventName].splice(index, 1);
        }
      }
    },

    _mFireEvent: function(eventName, eventObject) {
      if (typeof this['_on' + eventName] === 'function') {
        this['_on' + eventName](eventObject);
      }

      if (this._mEventHandlers[eventName]) {
        this._mEventHandlers[eventName].forEach(function(handler) {
          handler(eventObject);
        });
      }
    },

    _mInjectSession: function(session) {
      this.session = session;
      this._mFireEvent('sessionready', undefined);
    },

    _mReset: function() {
      for (var eventHandlers in this._mEventHandlers) {
        eventHandlers = [];
      }
      this._onavailable = undefined;
      this._onsessionready = undefined;
      this.session = undefined;
    }
  };

  exports.MockPresentation = MockPresentation;
}(window));
