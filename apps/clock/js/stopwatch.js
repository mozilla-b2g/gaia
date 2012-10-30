'use strict';

var StopWatch = {
  _elapsed: 0,

  get actionButton() {
    delete this.actionButton;
    var id = 'stopwatch-action-button';
    return this.actionButton = document.getElementById(id);
  },

  get resetButton() {
    delete this.resetButton;
    return this.actionButton = document.getElementById('reset-button');
  },

  get tickerView() {
    delete this.tickerView;
    return this.tickerView = document.getElementById('stopwatch-ticker-view');
  },

  get chronoView() {
    delete this.chronoView;
    return this.chronoView = document.getElementById('stopwatch-chrono-view');
  },

  execute: function sw_execute(action) {
    if (!this[action]) {
      return;
    }

    this[action]();
  },

  start: function sw_start() {
    this.actionButton.dataset.action = 'stop';

    this.updateChrono(this._elapsed);
    this.tickerView.classList.add('running');

    this._startTime = Date.now();
    this._ticker = setInterval(function sw_updateChrono(self) {
      var elapsed = Date.now() - self._startTime + self._elapsed;
      self.updateChrono(elapsed);
    }, 500, this);
  },

  stop: function sw_stop() {
    this.actionButton.dataset.action = 'start';
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
    var f = new navigator.mozL10n.DateTimeFormat();
    var currentValue = this.chronoView.innerHTML;
    var newValue = f.localeFormat(elapsed, '%M:%S');
    if (currentValue != newValue)
      this.chronoView.innerHTML = newValue;
  }
};

window.addEventListener('load', function onLoad() {
  window.removeEventListener('load', onLoad);

  StopWatch.actionButton.onclick = StopWatch.start.bind(StopWatch);
  StopWatch.resetButton.onclick = StopWatch.reset.bind(StopWatch);
});

