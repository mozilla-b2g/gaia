'use strict';

var Timer = {
  get actionButton() {
    delete this.actionButton;
    return this.actionButton = document.getElementById('timer-action-button');
  },

  get tickerView() {
    delete this.tickerView;
    return this.tickerView = document.getElementById('timer-ticker-view');
  },

  get chronoView() {
    delete this.chronoView;
    return this.chronoView = document.getElementById('timer-chrono-view');
  },

  get durationField() {
    delete this.durationField;
    return this.durationField = document.getElementById('duration-field');
  },

  execute: function ti_execute(action) {
    if (!this[action]) {
      return;
    }

    this[action]();
  },

  start: function ti_start() {
    if (!this.durationField.validity.valid) {
      return;
    }

    this.actionButton.dataset.action = 'cancel';
    this.chronoView.parentNode.classList.remove('ended');
    this.tickerView.classList.add('running');
    this.durationField.disabled = true;

    var duration = this.duration(this.durationField.value);
    var endTime = Date.now() + duration;
    this.updateChrono(duration);

    this._ticker = setInterval(function ti_updateChrono(self) {
      var remaining = endTime - Date.now();
      if (remaining <= 0) {
        self.updateChrono(0);
        self.end();
        return;
      }

      self.updateChrono(remaining);
    }, 500, this);
  },

  cancel: function ti_cancel() {
    this.actionButton.dataset.action = 'start';
    this.tickerView.classList.remove('running');
    this.durationField.disabled = false;

    this.updateChrono(0);

    clearInterval(this._ticker);
    delete this._ticker;
  },

  end: function ti_end() {
    //TODO: ring too
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 200, 200, 200, 200]);
    }

    this.cancel();
    this.chronoView.parentNode.classList.add('ended');
  },

  updateChrono: function ti_updateChrono(remaining) {
    var f = new navigator.mozL10n.DateTimeFormat();
    var currentValue = this.chronoView.innerHTML;
    var newValue = f.localeFormat(remaining, '%M:%S');
    if (currentValue != newValue)
      this.chronoView.innerHTML = newValue;
  },

  duration: function ti_duration(value) {
    var durationComponents = value.split(':');
    var duration = 0;
    for (var i = 0; i < durationComponents.length; i++) {
      var unitHandler = Math.pow(60, durationComponents.length - 1 - i);
      duration += unitHandler * 1000 * durationComponents[i];
    }

    return duration;
  }
};

window.addEventListener('load', function onLoad() {
  window.removeEventListener('load', onLoad);

  Timer.actionButton.onclick = Timer.start.bind(Timer);
});

