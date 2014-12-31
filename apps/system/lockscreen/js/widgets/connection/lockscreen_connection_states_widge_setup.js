/* global DOMEventSource */
/* global SettingSource */
/* global LockScreenBasicState */
'use strict';

/**
 * After setup resources & properties of this component, this state
 * would receive various changes to transfer to different state that
 * would update the connection information according to the change.
 **/
(function(exports) {
  var LockScreenConnectionStatesWidgetSetup = function(component) {
    LockScreenBasicState.apply(this, arguments);
    this.configs.name = 'LockScreenConnectionStatesWidgetSetup';
    // Just to prevent stream without stream would throw error.
    this.configs.stream.sources = [
      new DOMEventSource({
        events: [
          'voicechange',
          'simslot-cardstatechange',
          'simslot-iccinfochange',
          'cellbroadcastmsgchanged'
        ]}),
      new SettingSource({
        settings: [
          'ril.radio.disabled',
          'ril.telephony.defaultServiceId'
        ]})
      ];
  };
  LockScreenConnectionStatesWidgetSetup.prototype =
    Object.create(LockScreenBasicState.prototype);

  LockScreenConnectionStatesWidgetSetup.prototype.start = function() {
    return LockScreenBasicState.prototype.start.call(this)
      .next(this.queryElements.bind(this));
  };

  LockScreenConnectionStatesWidgetSetup.prototype.handleEvent = function(evt) {
    switch (evt.type) {
      case 'simslot-cardstatechange':
      case 'simslot-iccinfochange':
      case 'cellbroadcastmsgchanged':
      case 'ril.radio.disabled':
      case 'ril.telephony.defaultServiceId':
    }
  };

  LockScreenConnectionStatesWidgetSetup.prototype.queryElements = function() {
    var elements = this.component.resources.elements;
    for (var key in elements) {
      if ('string' === typeof elements[key]) {
        var query = elements[key];
        var result = document.querySelector(query);
        if (!result) {
          throw new Error(`Can't query element ${key} with query: ${query}`);
        }
        elements[key] = result;
      }
    }
  };

  exports.LockScreenConnectionStatesWidgetSetup =
    LockScreenConnectionStatesWidgetSetup;
})(window);

