function MockCall(aNumber, aState) {
  this._listenerAdded = false;
  this._listenerRemoved = false;

  this.number = aNumber;
  this.state = aState;

  this.answer = function() {};
  this.hangUp = function() {};
  this.hold = function() {};
  this.resume = function() {};

  this.mEmergencyNumbers = ['112', '911'];
  this.emergency = this.mEmergencyNumbers.indexOf(this.number) >= 0;

  this.mVoicemailNumbers = ['123'];
  this.voicemail = this.mVoicemailNumbers.indexOf(this.number) >= 0;

  this.addEventListener = (function(event, handler) {
    if (event == 'statechange') {
      this._listenerAdded = true;
      this._handler = handler;
    }

    if (event == 'disconnected') {
      this._disconnectHandler = handler;
    }
  }).bind(this);

  this.removeEventListener = (function(event) {
    if (event == 'statechange') {
      this._listenerRemoved = true;
    }
  }).bind(this);


  // Mocking the events
  this.mChangeState = (function(state) {
    if (this._handler) {
      this.state = state;
      if ('handleEvent' in this._handler) {
        this._handler.handleEvent({call: this});
      }
    }
  }).bind(this);

  this._connect = this.mChangeState.bind(this, 'connected');

  this._disconnect = (function() {
    this.mChangeState('disconnected');

    if (this._disconnectHandler) {
      this._disconnectHandler();
    }
  }).bind(this);

  this._hold = (function() {
    this.mChangeState('holding');
    this.mChangeState('held');
  }).bind(this);

  this._resume = (function() {
    this.mChangeState('resuming');
    this.mChangeState('resumed');
  }).bind(this);
}
