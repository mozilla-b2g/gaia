/* global DOMEventSource */
/* global LockScreenBasicState */
'use strict';

/**
 * This is a 'fixed-point' style state: since all new events are only
 * for updating the lines, it's no need to transfer to other states.
 **/
(function(exports) {
  var LockScreenConnectionStatesSIMWidgetSetup = function(component) {
    LockScreenBasicState.apply(this, arguments);
    this.configs.name = 'LockScreenConnectionStatesSIMWidgetSetup';
    this.configs.stream.sources = [
      new DOMEventSource({events: [
        'simslot-iccinfochange',
        'simslot-cardstatechange',
        'cellbroadcastmsgchanged',
        'voicechange'
      ]})
    ];
   };
  LockScreenConnectionStatesSIMWidgetSetup.prototype =
    Object.create(LockScreenBasicState.prototype);

  LockScreenConnectionStatesSIMWidgetSetup.prototype.start =
  function() {
    return LockScreenBasicState.prototype.start.call(this)
      .next(this.setupForwardVoicechange.bind(this))
      .next(this.queryElements.bind(this))
      .next(this.render.bind(this));
  };

  LockScreenConnectionStatesSIMWidgetSetup.prototype.handleEvent =
  function(evt) {
    switch (evt.type) {
      // These events would only notify changes are on which SIM,
      // but not what changed. So we need to re-render it again.
      case 'simslot-iccinfochange':
      case 'simslot-cardstatechange':
        if (evt.index === this.component.resources.simslot.index) {
          this.render();
        }
        break;
      case 'voicechange':
        this.render();
        break;
    }
  };

  /**
   * A necessary forwarding hack since the original 'voicechange'
   * event bring nothing about which SIM slot is the event source.
   */
  LockScreenConnectionStatesSIMWidgetSetup.prototype.setupForwardVoicechange =
  function() {
    this.component.resources.simslot.conn.addEventListener('voicechange',
      this.stream.sources[0].onchange);   // Already bound on the source.
  };

  LockScreenConnectionStatesSIMWidgetSetup.prototype.stopForwardVoicechange=
  function() {
    this.component.resources.simslot.conn.removeEventListener('voicechange',
      this.stream.sources[0].onchange);   // Already bound on the source.
  };

  LockScreenConnectionStatesSIMWidgetSetup.prototype.stop =
  function() {
    LockScreenBasicState.stop.call(this)
      .next(this.stopForwardVoicechange.bind(this));
  };

  /**
   * To render the line according to the informantion of this SIM slot.
   */
  LockScreenConnectionStatesSIMWidgetSetup.prototype.render =
  function() {
    
  };

  exports.LockScreenConnectionStatesSIMWidgetSetup =
    LockScreenConnectionStatesSIMWidgetSetup;
})(window);

