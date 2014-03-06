'use strict';

/* exported MockCall */

function MockCall(aNumber, aState) {
  this._eventListeners = {
    'statechange': [],
    'disconnected': []
  };

  this.number = aNumber;
  this.serviceId = 1;
  this.state = aState;

  this.answer = function() {};
  this.hangUp = function() {};
  this.hold = function() {};
  this.resume = function() {};

  this.mEmergencyNumbers = ['112', '911'];
  this.emergency = this.mEmergencyNumbers.indexOf(this.number) >= 0;

  this.mVoicemailNumbers = ['123'];
  this.voicemail = this.mVoicemailNumbers.indexOf(this.number) >= 0;

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

    var listeners = this._eventListeners[type];
    for (var i = listeners.length - 1; i >= 0; i--) {
      var callback = listeners[i];
      if (typeof callback === 'function') {
        callback({call: this});
      } else if (typeof callback == 'object' &&
                 typeof callback.handleEvent === 'function') {
        callback.handleEvent({call: this});
      }
    }
  };
}
