function MockCall(aNumber, aState) {
  this._listenerAdded = false;
  this._listenerRemoved = false;

  this.number = aNumber;
  this.state = aState;

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
