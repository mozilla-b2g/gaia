var StopWatch = {
  _elapsed: 0,

  get startStopButton() {
    delete this.startStopButton;
    return this.startStopButton = document.getElementById('start-stop-button');
  },

  get tickerView() {
    delete this.tickerView;
    return this.tickerView = document.getElementById('ticker-view');
  },

  get chronoView() {
    delete this.chronoView;
    return this.chronoView = document.getElementById('chrono-view');
  },

  execute: function sw_execute(action) {
    if (!this[action]) {
      return;
    }

    this[action]();
  },

  start: function sw_start() {
    this.startStopButton.dataset.action = 'stop';

    this.updateChrono(this._elapsed);
    this.tickerView.classList.add('running');

    this._startTime = Date.now();
    this._ticker = setInterval(function sw_updateChrono(self) {
      var elapsed = Date.now() - self._startTime + self._elapsed;
      self.updateChrono(elapsed);
    }, 1000, this);
  },

  stop: function sw_stop() {
    this.startStopButton.dataset.action = 'start';
    this.tickerView.classList.remove('running');

    this._elapsed += Date.now() - this._startTime;
    clearInterval(this._ticker);
    delete this._ticker;
    delete this._startTime;
  },

  reset: function sw_reset() {
    this.stop();
    this._elapsed = 0;
    this.updateChrono(this._elapsed);
  },

  updateChrono: function sw_updateChrono(elapsed) {
    this.chronoView.innerHTML = new Date(elapsed).toLocaleFormat('%M:%S');
  }
};
