/* global Process, Stream */
/* global LockScreenClockStop */
'use strict';

/**
 * The Clock widget on LockScreen.
 * Clock widget states:
 * Clock (init/start), ClockStop
 *
 * It would update the clock every minute.
 *
 * This widget combines actually two states into one:
 * the initialization and starting clock events. In theory, initialization
 * state don't tick the clock, and would transfer to start state to do this,
 * but to simplify it we combine these two state. So, this initialization
 * would tick the clock, and transfer to the stop state when it's necessary.
 *
 * A side note: it needn't update clock when the 24-hour setting changed
 * because user can't change it when this state is activated (screen locked).
 * However, to fetch it from mozL10n as properties is still necessary.
 * So this states (in fact, all LockScreen states) should be activated
 * only after l10n is ready.
 **/
(function(exports) {
  var LockScreenClockWidget = function() {
    this.configs = {
      timeFormat: null,
      interval: 60000 // Tick interval: update clock every minute.
    };
    this.states = {
      properties: null,
      idTickInterval: null,
      next: null
    };
    this.listens = {
      events: [ 'screenchange' ]
    };
    this.elements = {
      view: null,
      time: null,
      date: null
    };
    this.stream = new Stream();
    this.process = new Process();
  };

  /**
   * When we start/initialize this start (transfer to this state),
   * we tick the clock.
   */
  LockScreenClockWidget.prototype.start =
  function(view, properties) {
    this.setupView(view);
    this.stream
      .start(this.process)
      .events(this.listens.events)
      .handler(this.handleEvent.bind(this));
    this.process
      .start()
      .then(this.setupProperties.bind(this, properties))
      .then(this.tickClock.bind(this));
    return this.process;
  };

  LockScreenClockWidget.prototype.stop =
  function() {
    this.process
      .stop()
      .then(this.stream.stop.bind(this.stream))
      .then(() => {
        window.clearInterval(this.states.idTickInterval);
      })
      .catch(console.error.bind(console));
    return this.process;
  };

  LockScreenClockWidget.prototype.destroy =
  function() {
    this.process
      .destroy()
      .catch(console.error.bind(console));
    return this.process;
  };

  LockScreenClockWidget.prototype.setupView =
  function(view) {
    this.elements.view = view;
    this.elements.time = view.getElementById('lockscreen-clock-time');
    this.elements.date = view.getElementById('lockscreen-clock-date');
    Object.keys(this.elements).forEach((ename) => {
      if (null === this.elements[ename]) {
        throw new Error('Failed to find the element: ' + ename);
      }
    });
  };

  LockScreenClockWidget.prototype.setupProperties =
  function(properties) {
    this.configs.timeFormat = window.navigator.mozHour12 ?
      navigator.mozL10n.get('shortTimeFormat12') :
      navigator.mozL10n.get('shortTimeFormat24');
    this.states.properties = Object.create(properties);
  };

  LockScreenClockWidget.prototype.tickClock =
  function() {
    this.states.idTickInterval =
      setInterval(this.updateClock.bind(this),
      this.configs.interval);
  };

  LockScreenClockWidget.prototype.updateClock =
  function() {
    var now = Date.now();
    var f = new navigator.mozL10n.DateTimeFormat();
    var _ = navigator.mozL10n.get;

    var timeFormat = this.configs.timeFormat.replace('%p', '<span>%p</span>');
    var dateFormat = _('longDateFormat');
    var clockHTML = f.localeFormat(now, timeFormat);
    var dateText = f.localeFormat(now, dateFormat);

    this.elements.clock.innerHTML = clockHTML;
    this.elements.date.textContent = dateText;
  };

  LockScreenClockWidget.prototype.handleEvent =
  function(evt) {
    if ('screenchange' === evt.type && !evt.screenEnabled) {
      this.stop().then(this.transferToStopState.bind(this));
    }
  };

  LockScreenClockWidget.prototype.transferToStopState =
  function() {
    this.states.next = new LockScreenClockStop();
    return this.states.next
      .start(this.view, this.states.properties)
      .then(this.destroy.bind(this));
  };
  exports.LockScreeClockWidget = LockScreenClockWidget;
})(window);

