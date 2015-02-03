(function(exports) {
  'use strict';

  // Mock API from http://bit.ly/1uAh0jd
  var MockPresentationSession = {
    _id: undefined,

    get id () {
      return this._id;
    },

    _mEventHandlers: {
      'statechange': [],
      'message': []
    },

    _onstatechange: undefined,

    set onstatechange (handler) {
      if (typeof handler === 'function') {
        this._onstatechange = handler;
      }
    },

    _onmessage: undefined,

    set onmessage (handler) {
      if (typeof handler === 'function') {
        this._onmessage = handler;
      }
    },

    get onmessage () {
      return this._onmessage;
    },

    send: function(data) {
    },

    disconnect: function() {
      this._state = false;
    },

    // two states: true and false
    _state: false,

    get state () {
      return this._state;
    },

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

    _mCreateSession: function() {
      this._mReset();
      this._id = 'testsession';
      return this;
    },

    _mReset: function() {
      for (var eventHandlers in this._mEventHandlers) {
        eventHandlers = [];
      }
      this._onstatechange = undefined;
      this._onmessage = undefined;
      this._state = false;
    }

  };

  exports.MockPresentationSession = MockPresentationSession;
}(window));
