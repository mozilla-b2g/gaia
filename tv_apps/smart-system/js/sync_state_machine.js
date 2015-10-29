/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

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

  var SyncStateMachine = {
    state: 'disabled'
  };

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

  /**
   * Creates the state transition function per each event.
   *
   * For each state transition we trigger an event with name 'onSTATE' where
   * STATE is the name of the state where the machine transitioned to.
   * This event gets the name of the transition and the previous state as
   * arguments along with the additional arguments specific to the transition:
   *
   * {
   *   transition: <string>, // The name of the action that caused the
   *                         // transition.
   *   from: <string>  // The previous state the machine was before this
   *                   // transition.
   * }
   *
   * Example of an action 'A' causing a transition from state 'X' to state 'Y':
   *
   * SyncStateMachine.A('dummyArg');
   *
   * SyncStateMachine.onY = function(event, from) {
   *  alert(event); // 'A'
   *  alert(from); // 'X'
   *  alert(arguments); // '{'0': 'A', '1': 'X', '2': 'dummyArgs'}'
   * };
   *
   * We will end up with a SyncStateMachine object like:
   * {
   *    // Transitions.
   *    enable: function() {},
   *    disable: function() {},
   *    sync: function() {},
   *    error: function() {},
   *    success: function() {},
   *
   *    // Event handlers.
   *    onenabled: function(event, from) {},
   *    ondisabled: function(event, from) {},
   *    onenabling: function(event, from) {},
   *    ondisabling: function(event, from) {},
   *    onsyncing: function(event, from) {},
   *    onerrored: function(event, from) {}
   * }*
   */
  function createTransition(name, transition) {
    return (...args) => {
      // Checks if the transition is valid in the current state.
      if (!transitions[name][SyncStateMachine.state]) {
        throw new Error('Transition ' + name +
                        ' invalid for the current state');
      }

      var from = SyncStateMachine.state;
      var to = transition[from];

      if (from == to) {
        return;
      }

      // Transition to the next state.
      SyncStateMachine.state = to;

      // Publish the onSTATE event.
      var onstate = SyncStateMachine['on' + SyncStateMachine.state];
      if (!onstate || !(onstate instanceof Function)) {
        return;
      }
      onstate.apply(SyncStateMachine, [from, name].concat(args));
    };
  }

  for (var name in transitions) {
    if (!transitions.hasOwnProperty(name)) {
      continue;
    }
    SyncStateMachine[name] = createTransition(name, transitions[name]);
  }

  exports.SyncStateMachine = SyncStateMachine;

  // Exported only for testing purposes.
  exports.SyncStateMachineTransitions = transitions;
}(window));
