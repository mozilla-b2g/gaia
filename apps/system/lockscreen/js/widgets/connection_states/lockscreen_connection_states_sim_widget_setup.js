/* global DOMEventSource */
/* global LockScreenBasicState */
/* global SIMSlotManager, MobileOperator */
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
      // After our forwarding hack this must happen on the SIM.
      case 'voicechange':
        this.render();
        break;
      case 'cellbroadcastmsgchanged':
        this.renderCellbroadcastMessage(evt.detail);
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
      this.stream.sources[0].onchange);   // Already bound with the source.
  };

  LockScreenConnectionStatesSIMWidgetSetup.prototype.stopForwardVoicechange=
  function() {
    this.component.resources.simslot.conn.removeEventListener('voicechange',
      this.stream.sources[0].onchange);   // Already bound with the source.
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
    var sim = this.component.resources.simslot;
    var elements = this.component.resources.elements;
    elements.view.hidden = false;

    // Reset the line.
    this.eraseLabel(elements.line);

    // Whether the ID should display.
    if (SIMSlotManager.isMultiSIM()) {
      elements.id.hidden = false;
      this.writeLabel(elements.id, 'lockscreen-sim-id',
        { 'n': (sim.index + 1) });
    } else {
      elements.id.hidden = true;
    }

    // If it's multi-SIM device &
    //    there is only absent SIM =
    //    hide the line
    if (SIMSlotManager.isMultiSIM() &&
        1 === navigator.mozIccManager.iccIds.length &&
        sim.isAbsent()) {
      elements.view.hidden = true;
      return;
    }

    if ('notSearching' === sim.conn.voice.state) {
      this.writeLabel(elements.line, 'noNetwork');
      return;
    } else if ('registered' !== sim.conn.voice.state){
      // From Bug 777057 Comment 3:
      // "
      //  For the voice network, when state == "registered", connected will
      //  be true.This won't necessarily be true for the data network.
      //  Only when state == "registered" and the data call is active,
      //  connected will true.
      // "
      // Although the doc is very unclear:
      // connected: "A boolean that indicates whether the connection is ready."
      //            https://mdn.io/MozMobileConnectionInfo.connected
      // And there is even no information for states!
      //            https://mdn.io/MozMobileConnectionInfo.state
      // Anyway, from https://bugzil.la/777057 it shows only 'notSearching'
      // means it's no network, and other three states are for grabbing the
      // network.
      this.writeLabel(elements.line, 'searching');
      return;
    } else {
      // If it's connected (state === 'registered'), show the operator and
      // other information.
      // Write it as a method to avoid nasty nested if...else
      this.renderNetworkConnected(elements, sim);
    }
  };

  LockScreenConnectionStatesSIMWidgetSetup.prototype.
  renderCellbroadcastMessage = function(message) {
    this.writeLabel(this.component.resources.elements.line,
        null, null, message);
  };

  LockScreenConnectionStatesSIMWidgetSetup.prototype.renderNetworkConnected =
  function(elements, sim) {
    var operator = MobileOperator.userFacingInfo(sim.conn).operator;
    if (sim.conn.voice.roaming) {
      this.writeLabel(elements.line, 'roaming', { 'operator': operator });
    } else {
      if (operator.carrier) {
        // With carrier, use L10N tag to display the information.
        this.writeLabel(elements.line, 'operator-info', {
          'carrier': operator.carrier,
          'region' : operator.region
        });
      } else {
        // No carrier. Just post the name of the operator.
        this.writeLabel(elements.line, null, null, operator);
      }
    }
  };

  /**
   * Alias it to make it more clear.
   */
  LockScreenConnectionStatesSIMWidgetSetup.prototype.writeLabel =
  function(node, l10nId, l10nArgs, text) {
    if (l10nId) {
      navigator.mozL10n.setAttributes(node, l10nId, l10nArgs);
    } else if (text) {
      node.textContent = text;
    }
  };

  LockScreenConnectionStatesSIMWidgetSetup.prototype.eraseLabel =
  function(node) {
    node.removeAttribute('data-l10n-id');
    node.textContent = '';
  };

  LockScreenConnectionStatesSIMWidgetSetup.prototype.queryElements =
  function() {
    var elements = this.component.resources.elements;
    for (var key in elements) {
      if ('string' === typeof elements[key]) {
        var query = elements[key];
        var result = elements.view.querySelector(query);
        if (!result) {
          throw new Error(`Can't query element ${key} with query: ${query}`);
        }
        elements[key] = result;
      }
    }
  };

  exports.LockScreenConnectionStatesSIMWidgetSetup =
    LockScreenConnectionStatesSIMWidgetSetup;
})(window);

