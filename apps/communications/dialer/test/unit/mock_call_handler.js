var MockCallHandler = {
  _lastCall: null,

  call: function call(number) {
    this._lastCall = number;
  }
};
