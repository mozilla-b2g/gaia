/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global BaseModule */

/*
       +---------------Success ---------------+
       |                                      |
   +---+----+                                 |
   |Enabling+---Error---+                     |
   +---+----+           |                     |
       ^              +-v-----+               |
       |   +-Disable--+Errored+-----------+   |
       |   |          +--+----+           |   |
     Enable|             ^   ^         Enable |
       |   v             |   |            |   |
       | +---------+     |   |            |   |
       | |Disabling|     |   |            |   |
       | +-+-------+     |   |            |   |
       |   |             |   |            v   v
  +----+---v-+           |   +--------+--------+
  | Disabled |         Error +------->+Enabled +---+
  +----------+           |   |        +---+----+   |
       ^   ^             |   |            |        |
       |   |             | Success       Sync      |
       |   |             |   |            |        |
  +----+---+--+          |   |            |        |
  | Disabling |          |   |            |        |
  +-----------+          |   |            |        |
       ^   ^             |   |            |        |
       |   |             |   |            |        |
       | Disable         |   |            |        |
       |   |         +---+---+            |        |
       |   +--------+|Syncing|<-----------+        |
       |             +-------+                     |
       |                                           |
       +--------------Disable  --------------------+

*/

'use strict';

(function(exports) {
  /**
   * Object representing the possible transitions and the associated states.
   * {
   *   transitionName: {
   *     from: to,
   *     from: to
   *     ...
   *   },
   *   ...
   * }
   */
  const transitions = {
    enable: {
      'disabled': 'enabling',
      'errored': 'enabled'
    },
    disable: {
      'enabled': 'disabling',
      'errored': 'disabling',
      'syncing': 'disabling'
    },
    sync: {'enabled': 'syncing'},
    success: {
      'disabling': 'disabled',
      'enabling' : 'enabled',
      'syncing'  : 'enabled'
    },
    error: {
      'disabling': 'errored',
      'enabled'  : 'errored',
      'enabling' : 'errored',
      'syncing'  : 'errored'
    }
  };

  var SyncStateMachine = function() {};

  SyncStateMachine.STATES = [
    'state' // can be: disabled, enabling, enabled, syncing, disabling or
            // errored.
  ];

  SyncStateMachine.SERVICES = [
    'enable',
    'disable',
    'sync',
    'success',
    'error'
  ];

  SyncStateMachine.SUB_MODULES = [];

  BaseModule.create(SyncStateMachine, {
    name: 'SyncStateMachine',
    DEBUG: false,
    EVENT_PREFIX: 'onsync',

    _state: 'disabled',

    /**
     * Creates the state transition function per each event.
     *
     * This is exposed via Service.request('SyncStateMachine.TRANSITION'),
     * where TRANSITION is the name of the transition.
     *
     * For each successful transition we publish an event in the window object
     * with name 'SyncStateMachineSTATE', where STATE is the name of the state
     * where the machine transitioned to. This event gets as details an object
     * like:
     * {
     *   transition: <string>, // The name of the action that caused the
     *                         // transition.
     *   from: <string>  // The previous state the machine was before this
     *                   // transition.
     * }
     *
     * Example of a transition request 'doB' causing a transition from state
     * 'A' to state 'B':
     *
     * Service.request('SyncStateMachine:doB', 'whatever').then(() => {...});
     *
     * window.addEventListener('onsyncB', event => {
     *   event.detail.transition; // 'doB'
     *   event.detail.from; // 'A'
     *   event.detail.args; // ["whatever"]
     *
     *   // We can check at this point that the current state is B:
     *   Service.query('SyncStateMachine.state'); // B
     * });
     */
    _createTransition: function(name, event) {
      return (...args) => {
        // Checks if the transition is valid in the current state.
        if (!transitions[name][this._state]) {
          throw new Error(`Transition ${name} invalid for the current state`);
        }

        var from = this._state;
        var to = event[from];

        if (from == to) {
          return;
        }

        // Transition to the next state.
        this._state = to;

        // Publish the syncSTATE event.
        this.publish(to, {
          transition: name,
          from: from,
          args: args
        });
      };
    },

    _start: function() {
      for (var name in transitions) {
        if (!transitions.hasOwnProperty(name)) {
          continue;
        }
        this[name] = this._createTransition(name, transitions[name]);
      }
    },

    _stop: function() {}
  }, {
    state: {
      get: function() {
        return this._state;
      }
    }
  });

  // Exported only for testing purposes.
  exports.SyncStateMachineTransitions = transitions;

}(window));
