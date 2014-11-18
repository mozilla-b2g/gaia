/* global Stream, Process, SettingsCache */
/* global LockScreenSecurePanel, LockScreenPasscodePanel, LockScreenHidePanel */
/* global LockScreenClockWidget, LockScreenSliderWidget */

'use strict';

/**
 * The main panel shows a slider to let user unlock.
 **/
(function(exports) {
  var LockScreenMainPanel = function() {
    this.states = {
      next: null,
      properties: {}  // Some properties need to be read from settings.
    };
    this.listens = {
      settings: [
        'lockscreen.passcode-lock.enabled'
      ],
      // We don't listen events could be queued, since the events we care about
      // all trigger transferring, which would stop the queue works.
      interrupts: [
        'secureapp-opening',
        'lockscreenslide-activate-right',
        'lockscreenslide-activate-left'
      ]
    };
    // Sub-components of this panel.
    this.widgets = {
      slider: null,
      clock: null
    };
    // The DOM it get to control.
    // Properties can view would be passed to the next state.
    // Since we need to avoid fetch every properties and elements
    // every time new state get started.
    this.elements = {
      view: null,
      sliderView: null,
      clockView: null
    };
    // Stream would take care about whether event should be handled
    // according to the process status. If it's stopped, then all queued
    // events would not be handled anymore.
    this.stream = new Stream();
    // All method would need to hook on the process (wrapped Promise),
    // so that we can have event queueing, transferring, stopping
    // and destroying in order.
    this.process = new Process();
    this.settings = new SettingsCache();
  };

  /**
   * Activate this panel state: grab all settings it interests in,
   * register events and prepare to transfer to the next state.
   *
   * Would return a Promise that be resolved after all steps get done.
   *
   * view: the element it can draw self
   * properties: the properties from parent
   */
  LockScreenMainPanel.prototype.start =
  function(view, properties) {
    // View setup is irrelevant to reading properties from settings.
    this.setupView();

    // Event stream must be initialized before asynchronous steps, or we
    // miss events. By the way, Stream would take the same process to
    // prevent the extra effort to maintain two Promises.
    this.stream
      .start(this.process)
      .interrupts(this.listens.interrupts)
      .handler(this.handleEvent.bind(this));

    // We don't need to listen settings change here since user would never
    // be able to change the value while this panel appears.
    this.process
      .start()  // Start the process.
      .then(this.setupProperties.bind(this, properties))
      .then(this.setupWidgets.bind(this))
      .then(this.stream.ready.bind(this.stream))
      .catch(console.error.bind(console));
    return this.process;
  };

  /**
   * Deactivate this panel state. Release all hooks on events and settings.
   * Stop method must return 'then-able' because the real stopping time is
   * asynchronous with the method call, although some state may have no such
   * behavior.
   *
   * Via stopping the process we guarantee that not input would be received
   * and handled anymore, since Stream would check if the process is stopped
   * to decided it should handle the logics or not. So, after stopping, our
   * panel still can handle the final step to destroy itself, but this step
   * would not be invoked by event/setting change, but only by another panel
   * with the method calling way to notify it now is going to be destroyed.
   */
  LockScreenMainPanel.prototype.stop =
  function() {
    this.process
      .stop() // Notify the process it is going to be stopped.
      .then(this.stream.stop.bind(this.stream))
      .then(this.stopWidgets.bind(this))
      .catch(console.error.bind(console));
    return this.process;
  };

  LockScreenMainPanel.prototype.destroy =
  function() {
    this.process
      .destroy()  // Notify the process it must be destroyed.
      .then(this.destoryWidgets.bind(this))
      .catch(console.error.bind(console));
    return this.process;
  };

  LockScreenMainPanel.prototype.transferToPasscodePanel =
  function() {
    this.states.next = new LockScreenPasscodePanel();
    // Only when the next state started, we destroy this one
    // (the previous panel).
    return this.states.next
      .start(this.view, this.states.properties)
      .then(this.destroy.bind(this));
  };

  LockScreenMainPanel.prototype.transferToSecurePanel =
  function() {
    this.states.next = new LockScreenSecurePanel();
    return this.states.next
      .start(this.view, this.states.properties)
      .then(this.destroy.bind(this));
  };

  LockScreenMainPanel.prototype.transferToHidePanel =
  function() {
    this.states.next = new LockScreenHidePanel();
    return this.states.next
      .start(this.view, this.states.properties)
      .then(this.destroy.bind(this));
  };

  /**
   * While we have event & promise in our code, keeping handleEvent as simple
   * as the original API shows benefits. This is because this function can care
   * nothing about event queueing, component active/deactive but only focuses
   * on handle the incoming events.
   */
  LockScreenMainPanel.prototype.handleEvent =
  function(evt) {
    switch(evt.type) {
      case 'secureapp-opening':
        this.stop()
          .then(this.transferToSecurePanel.bind(this));
        break;
      case 'lockscreenslide-activate-right':
        if (this.states.properties['lockscreen.passcode-lock.enabled']) {
          this.stop().then(this.transferToSecurePanel.bind(this));
        } else {
          this.stop().then(this.transferToPasscodePanel.bind(this));
        }
        break;
      case 'lockscreenslide-activate-left':
        this.stop().then(this.transferToSecurePanel.bind(this));
        break;
    }
  };

  /**
   * Need to read the initial values from settings, and set up other static
   * properties.
   */
  LockScreenMainPanel.prototype.setupProperties =
  function(properties) {
    // First, extend properties with those from parent.
    this.states.properties = Object.create(this.states.properties);
    // And then, fetch it from settings.
    var requests = this.listens.settings.map((sname) => {
      return this.settings.get(sname);
    });
    return Promise.all(requests);
  };

  LockScreenMainPanel.prototype.setupWidgets =
  function() {
    // Keep it immutable since children should not modify the shared
    // and parent's properties.
    var properties =
      Object.freeze(Object.create(this.states.properties));
    this.widgets.clock = new LockScreenClockWidget();
    this.widgets.slider = new LockScreenSliderWidget();
    return Promise.all([
        this.widgets.clock.start(this.elements.clockView, properties),
        this.widgets.slider.start(this.elements.sliderView, properties)
    ]);
  };

  LockScreenMainPanel.prototype.setupView =
  function(view) {
    this.elements.view = view;
    this.elements.sliderView =
      view.getElementById('lockscreen-slider-widet');
    this.elements.clockView =
      view.getElementById('lockscreen-clock-widet');
    Object.keys(this.elements).forEach((ename) => {
      if (null === this.elements[ename]) {
        throw new Error('Failed to find the element: ' + ename);
      }
    });
  };

  LockScreenMainPanel.prototype.stopWidgets =
  function() {
    return Promise.all([
        this.widgets.clock.stop(),
        this.widgets.slider.stop()]);
  };
  exports.LockScreenMainPanel = LockScreenMainPanel;
})(window);

