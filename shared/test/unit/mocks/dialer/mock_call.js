'use strict';

/* exported MockCall */

function MockCall(aNumber, aState, aServiceId) {
  this._eventListeners = {
    'connected': [],
    'disconnected': [],
    'error': [],
    'statechange': []
  };

  this.id = { number: aNumber };
  this.serviceId = (aServiceId === undefined) ? 1 : aServiceId;
  this.state = aState;
  this.switchable = true; // The call can be put on hold by default
  this.mergeable = true; // The call can be merged by default

  this.answer = function() {
    this._connect();
  };
  this.hangUp = function() {
    this._disconnect();
  };
  this.hold = function() {};
  this.resume = function() {};

  this.mEmergencyNumbers = ['112', '911'];
  this.emergency = this.mEmergencyNumbers.indexOf(aNumber) >= 0;

  this.mVoicemailNumbers = ['123'];
  this.voicemail = this.mVoicemailNumbers.indexOf(aNumber) >= 0;

  this.addEventListener = (function(type, handler) {
    if (this._eventListeners[type]) {
      this._eventListeners[type].push(handler);
    }
  }).bind(this);

  this.removeEventListener = (function(type, handler) {
    if (this._eventListeners[type]) {
      var idx = this._eventListeners[type].indexOf(handler);
      this._eventListeners[type].splice(idx, 1);
    }
  }).bind(this);

  this.triggerEvent = function(type) {
    this._mTriggerEventListeners(type);
  },

  // Mocking the events
  this.mChangeState = (function(state) {
    this.state = state;
    this._mTriggerEventListeners('statechange');
  }).bind(this);

  this._connect = this.mChangeState.bind(this, 'connected');

  this._disconnect = (function() {
    this.mChangeState('disconnected');
    this._mTriggerEventListeners('disconnected');
  }).bind(this);

  this._hold = (function() {
    this.mChangeState('holding');
    this.mChangeState('held');
  }).bind(this);

  this._resume = (function() {
    this.mChangeState('resuming');
    this.mChangeState('connected');
  }).bind(this);

  this._mTriggerEventListeners = function(type) {
    if (!this._eventListeners[type]) {
      return;
    }

    var self = this;
    this._eventListeners[type].forEach(function(callback) {
      if (typeof callback === 'function') {
        callback({call: self});
      } else if (typeof callback == 'object' &&
                 typeof callback.handleEvent === 'function') {
        callback.handleEvent({call: self});
      }
    });
  };
}
