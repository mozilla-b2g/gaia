function MockCall(aNumber, aState) {
  this._listenerAdded = false;
  this._listenerRemoved = false;

  this.number = aNumber;
  this.state = aState;

  this.mEmergencyNumbers = ['112', '911'];
  this.emergency = this.mEmergencyNumbers.indexOf(this.number) >= 0;

  this.mVoicemailNumbers = ['123'];
  this.voicemail = this.mVoicemailNumbers.indexOf(this.number) >= 0;

  this.addEventListener = (function(event, handler) {
    if (event == 'statechange') {
      this._listenerAdded = true;
      this._handler = handler;
    }
  }).bind(this);

  this.removeEventListener = (function(event) {
    if (event == 'statechange') {
      this._listenerRemoved = true;
    }
  }).bind(this);


  // Mocking the events
  this._connect = (function() {
    if (this._handler) {
      this.state = 'connected';
      this._handler.handleEvent({call: this});
    }
  }).bind(this);

  this._busy = (function() {
    if (this._handler) {
      this.state = 'busy';
      this._handler.handleEvent({call: this});
    }
  }).bind(this);

  this._disconnect = (function() {
    if (this._handler) {
      this.state = 'disconnected';
      this._handler.handleEvent({call: this});
    }
  }).bind(this);

  this._hold = (function() {
    if (this._handler) {
      this.state = 'holding';
      this._handler.handleEvent({call: this});
      this.state = 'held';
      this._handler.handleEvent({call: this});
    }
  }).bind(this);

  this._resume = (function() {
    if (this._handler) {
      this.state = 'resuming';
      this._handler.handleEvent({call: this});
      this.state = 'resumed';
      this._handler.handleEvent({call: this});
    }
  }).bind(this);
}
