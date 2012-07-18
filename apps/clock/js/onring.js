/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
'use strict';

var RingView = {

  get time() {
    delete this.time;
    return this.time = document.getElementById('ring-clock-time');
  },

  get hourState() {
    delete this.hourState;
    return this.hourState = document.getElementById('ring-clock-hour24-state');
  },

  init: function rv_init() {
    this.updateTime();
    document.addEventListener('mozvisibilitychange', this);
    document.getElementById('ring-btn-snooze').addEventListener('click', this);
    document.getElementById('ring-btn-close').addEventListener('click', this);
  },

  updateTime: function rv_updateTime() {
    var d = new Date();

    // XXX: respect clock format in Settings
    var hour = d.getHours() % 12;
    if (!hour)
      hour = 12;
    this.time.textContent = hour + d.toLocaleFormat(':%M');
    this.hourState.textContent = d.toLocaleFormat('%p');

    var self = this;
    this._timeout = window.setTimeout(function cv_clockTimeout() {
      self.updateTime();
    }, (59 - d.getSeconds()) * 1000);
  },

  handleEvent: function rv_handleEvent(evt) {
    switch (evt.type) {
      case 'mozvisibilitychange':
        if (document.mozHidden) {
          window.clearTimeout(this._timeout);
          return;
        }
        // Refresh the view when app return to foreground.
        this.updateTime();
        break;

      case 'click':
        var input = evt.target;
        if (!input)
          return;

        switch (input.id) {
          case 'ring-btn-snooze':
            window.opener.AlarmManager.snoozeHandler();
            window.close();
            break;

          case 'ring-btn-close':
            window.opener.AlarmManager.cancelHandler();
            window.close();
            break;
        }
        break;
    }
  }

};

RingView.init();
