/**
  Copyright 2012, Mozilla Foundation

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
 */

/* global SettingsListener, System */
/* global LockScreenStateSlideShow, LockScreenStateKeypadShow */
/* global LockScreenStateKeypadHiding, LockScreenStateKeypadRising */
/* global LockScreenStatePanelHide */
/* global LockScreenStateLogger */

'use strict';

/**
 * This component control the state machine of LockScreen panel transitioning
 * and other states, instead of place more and more complicated 'if...else' and
 * event handling code in the monolithic LockScreen component, which even make
 * things worse because the code usually scatter about everywhere.
 *
 * The external states it depends:
 *  passcode enabled/disabled, screen turned on/off
 *
 * The panel states it cares:
 *  keypad-full/rising/hiding, slide shows, panel hidden
 *
 * It would transfer to the next state while any event fired, setting changed,
 * or the previous state transferring completed. Everytime we transfer it, we
 * would match all defined rules, to see if we can find a matched rule, and
 * it's corresponding state. If so, we would transfer to the new state. See
 * the 'setupRules' and 'transfer' methods.
 *
 * To splite keypad states as show, rising and hiding is because of the need
 * to stop the animation immediately while user turn the screen on and off
 * quickly.
 *
 * The problem this component trys to resolve:
 *
 * To make LockScreen react with external states change like homekey press or
 * the screen got turned on, and the internal states change like the panel
 * transition ended, this component would collect them all and trigger one
 * 'transfer' method, to transfer the current state of LockScreen to the next
 * one according to the transferring table set by the 'setupRules' method.
 * The major difference between the 'if...else' and transferring table is
 * the former, which would also be affected by the asynchronous behavior,
 * is unavoidable to become too nested and complicated. Of course to expand the
 * nested 'if...else' with some table-like code would be helpful, but it's not
 * flexible enough, and, according to what the existing LockScreen shows, to
 * manage more and more flags in such component would make them complicated
 * again. So this component trys to resolve the issue with the 'real'
 * transferring table, rather than refactoring the 'if...else' only.
 */
(function(exports) {

  var LockScreenStateManager = function() {};

  LockScreenStateManager.prototype.start =
  function lssm_start(lockScreen) {
    this.lockScreen = lockScreen;
    this.logger = (new LockScreenStateLogger()).start({
      debug: false
    });
    this.configs = {
      listenEvents: [
        'lockscreen-notify-homepressed',
        'screenchange',
        'lockscreen-request-unlock',
        'lockscreen-request-lock',
        'lockscreen-appclosed',
        'lockscreenslide-activate-right',
        'lockscreen-keypad-input'
      ],
      observers: {
        'lockscreen.passcode-lock.enabled':
          this.onPasscodeEnabledChanged.bind(this)
      }
    };
    // The state 'templates'. This component would do transfer among
    // these states.
    this.states = {
      slideShow: (new LockScreenStateSlideShow()).start(this.lockScreen),
      keypadShow: (new LockScreenStateKeypadShow()).start(this.lockScreen),
      keypadHiding: (new LockScreenStateKeypadHiding()).start(this.lockScreen),
      keypadRising: (new LockScreenStateKeypadRising()).start(this.lockScreen),
      panelHide: (new LockScreenStatePanelHide()).start(this.lockScreen)
    };

    // Default values
    this.lockScreenDefaultStates = {
      screenOn: true,   // We assume that the screen is on after booting
      passcodeEnabled: false,
      passcodeTimeout: true, // If timeout, do show the keypad
      homePressed: false,
      activateUnlock: false,
      transitionEnd: false,
      unlocking: false,
      keypadInput: '',
      forciblyUnlock: false
    };
    Object.freeze(this.lockScreenDefaultStates);

    // Clone the value to a mutable map.
    this.lockScreenStates = Object.keys(this.lockScreenDefaultStates)
      .reduce((result, key) => {
        result[key] = this.lockScreenDefaultStates[key];
        return result;  // Reduce with slight side-effect.
      }, {});

    this.previousState = this.states.slideShow;
    this.listenEvents();
    this.observeSettings();
    this.setupRules();
    return this;
  };

  /**
   * Set up all basic transferring rules. When we invoke the 'transfer'
   * method, it would test if there is anyone rule match the
   * current state and input, and chose the corresponding state
   * to transfer.
   *
   * To manage more external/internal state changes, use the 'registerRule'
   * method exposed by this component. It's possible to extend the design
   * here to eliminate this monolithic set up function, but in the current
   * refactoring stage we still keep this method.
   */
  LockScreenStateManager.prototype.setupRules =
  function lssm_setupRules() {
    this.rules = new Map();

    this.registerRule({
      screenOn: true,
      unlocking: false
    },
    ['panelHide'],
    this.states.slideShow,
    'Resume from screen off');

    this.registerRule({
      passcodeEnabled: true,
      passcodeTimeout: true,
      screenOn: true,
      activateUnlock: true
    },
    ['slideShow'],
    this.states.keypadRising,
    'When it activate to unlock, show the passcode pad with' +
    ' animation.');

    this.registerRule({
      passcodeEnabled: true,
      screenOn: true,
      homePressed: true
    },
    ['keypadShow'],
    this.states.keypadHiding,
    'When press homekey, show the slide with animation.');

    this.registerRule({
      passcodeEnabled: true,
      screenOn: true,
      transitionEnd: true,
      unlocking: false
    },
    ['keypadHiding'],
    this.states.slideShow,
    'After the animation, it should show the slide to response' +
    'to the homekey pressing.');

    this.registerRule({
      screenOn: false
    },
    ['keypadShow', 'keypadHiding', 'keypadRising'],
    this.states.slideShow,
    'When the screen is off, the slide should show as cache.');

    this.registerRule({
      passcodeEnabled: true,
      screenOn: true,
      transitionEnd: true
    },
    ['keypadRising'],
    this.states.keypadShow,
    'When the animation is done, show the keypad.');

    this.registerRule({
      passcodeEnabled: true,
      screenOn: true,
      unlocking: true,
    },
    ['keypadShow'],
    this.states.keypadHiding,
    'When it unlock with passcode, hide all panel with animation.');

    this.registerRule({
      passcodeEnabled: true,
      screenOn: true,
      transitionEnd: true,
      unlocking: true
    },
    ['keypadHiding'],
    this.states.panelHide,
    'When the animation done, show no panel for unlocking.');

    this.registerRule({
      keypadInput: 'c'
    },
    ['keypadShow'],
    this.states.keypadHiding,
    'When user input the correct key code, hide the pad.');
  };

  /**
   * This function would try to match the 'currentStates', which
   * may include the new outputs from the previous state, to see
   * if we need to transfer to a new state. If we can't find a
   * matched rule, we do no-op.
   *
   * Please note the 'currentStates' may be overwritten, so the
   * better way is to provide a new object when everytime this
   * function got invoked. The reason why this function doesn't
   * prevent it is because 'JSON.parse(JSON.stringify( obj ))'
   * sucks, and there is no way to do the deep copy like that.
   *
   * @param currentStates {object} - the current LockScreen states
   */
  LockScreenStateManager.prototype.transfer =
  function lssm_transfer(currentStates) {
    this.logger
      .debug('Do transfer; input: ', currentStates)
      .debug('Previous state:', this.previousState.type);

    // Not unlocking and not locked.
    // Unlocking would be set false after the System got unlocked,
    // because the final event would be fired later.
    if (!this.lockScreenStates.unlocking && !System.locked) {
      this.logger.debug('Do no transfer since System is unlocked.');
      return;
    }

    // Find what rule match the current LockScreen states.
    for (var [conditions, state] of this.rules) {
      this.logger.verbose('Try to match with: ', state.type);
      if (state.type === this.previousState.type) {
        this.logger.verbose('Do no matching since previous state ' +
          'is equal to the possible new state');
      } else if (
        this.matchAcceptableState(conditions.previous, this.previousState) &&
        this.matchStates(conditions, currentStates) &&
        state.type !== this.previousState.type) {

        this.logger.debug('Matched with state', state.type)
                   .debug('Reason: ', conditions[':comment']);
        this.logger.transfer(this.previousState.type, state.type, conditions);
        // State would do transfer and output.
        state.transferTo(currentStates)
             .then(this.onTransferringDone.bind(this))
             .catch(this.onTransferringError.bind(this));
        this.previousState = state;
        // It should match only one state, but we should keep
        // mistake-proofing in our design.
        return;
      } else {
        this.logger.verbose(
          'To match conditions with the current LockScreen states, ' +
          'but it falied');
      }
    }
    this.logger.debug('No matched rule');
  };

  LockScreenStateManager.prototype.observeSettings =
  function lssm_observeSettings() {
    Object.keys(this.configs.observers).forEach((key) => {
      SettingsListener.observe(key, false ,this.configs.observers[key]);
    });
  };

  LockScreenStateManager.prototype.listenEvents =
  function lssm_listenEvents() {
    this.configs.listenEvents.forEach((ename) => {
      window.addEventListener(ename, this);
    });
  };

  /**
   * When event happened, we trigger transferring.
   * Some events, or LockScreen states changes, would change the
   * state permantely, like the 'screenchange' event. However,
   * some of them are only signaling and don't change LockScreen
   * states, like 'home' event. We would map them all to the
   * transferring input, and invoke the 'transfer' method.
   */
  LockScreenStateManager.prototype.handleEvent =
  function lssm_handleEvent(evt) {
    var detail;
    if ('undefined' === typeof evt.detail ||
        null === evt.detail) {
      detail = {};
    } else {
      detail = evt.detail;
    }
    switch(evt.type) {
      case 'screenchange':
        // Do nothing if it's turned off by proximity sensor.
        if ('proximity' === detail.screenOffBy) {
          break;
        }
        this.onScreenChanged(detail.screenEnabled);
        break;
      case 'lockscreen-notify-homepressed':
        this.onHomePressed();
        break;
      case 'lockscreenslide-activate-right':
        this.onActivateUnlock();
        break;
      case 'lockscreen-request-unlock':
        if (detail.forcibly) {
          this.onForciblyUnlock();
        } else {
          this.onUnlock();
        }
        break;
      case 'lockscreen-request-lock':
        this.onLock(detail);
        break;
      case 'lockscreen-appclosed':
        this.onAppClosed();
        break;
      case 'lockscreen-keypad-input':
        this.onKeypadInput(detail.key);
        break;
    }
  };

  LockScreenStateManager.prototype.onScreenChanged =
  function lssm_onScreenChanged(value) {
    var inputs = this.extend(this.lockScreenStates, {
      screenOn: value
    });
    this.transfer(inputs);
    this.lockScreenStates.screenOn = value;
  };

  LockScreenStateManager.prototype.onHomePressed =
  function lssm_onHomePressed(value) {
    var inputs = this.extend(this.lockScreenStates, {
      homePressed: true
    });
    this.transfer(inputs);
  };

  LockScreenStateManager.prototype.onUnlock =
  function lssm_onUnlock(detail) {
    var inputs = this.extend(this.lockScreenStates, {
      unlocking: true,
    });
    this.lockScreenStates.unlocking = true;  // We're now unlocking.
    this.transfer(inputs);
  };

  LockScreenStateManager.prototype.onForciblyUnlock =
  function lssm_onUnlock(detail) {
    var inputs = this.extend(this.lockScreenStates, {
      forciblyUnlock: true
    });
    // Forcibly unlock should come without animation,
    // so we don't keep state.
    this.transfer(inputs);
  };

  LockScreenStateManager.prototype.onLock =
  function lssm_onUnlock(detail) {
    // To prevent unlock and lock hurriedly.
    if (this.lockScreenStates.unlocking) {
      this.lockScreenStates.unlocking = false;
    }
    this.transfer(this.extend(this.lockScreenStates, {}));
  };

  LockScreenStateManager.prototype.onAppClosed =
  function lssm_onAppClosed() {
    var inputs = this.extend(this.lockScreenStates, {
      unlocking: false
    });
    this.lockScreenStates.unlocking = false;  // We're now not unlocking.
    this.transfer(inputs);
  };

  LockScreenStateManager.prototype.onActivateUnlock =
  function lssm_onActivateUnlock() {
    var inputs = this.extend(this.lockScreenStates, {
      passcodeTimeout: this.lockScreen.checkPassCodeTimeout(),
      activateUnlock: true
    });
    this.transfer(inputs);
  };

  LockScreenStateManager.prototype.onKeypadInput =
  function lssm_onKeypadInput(key) {
    var inputs;
    switch(key) {
      case 'c':
      inputs = this.extend(this.lockScreenStates, {
        keypadInput: 'c'
      });
      break;
    }
    if (inputs) {
      this.transfer(inputs);
    }
  };

  /**
   * In theory, we should turn all states changes, no matter it's
   * caused by event or settings changes, into transferring method
   * invocation. However, we don't transfer states in this case
   * because it's impossible to change passcode while LockScreen
   * is on, and it's no need to do the transferring while the user
   * is changing the passcode.
   */
  LockScreenStateManager.prototype.onPasscodeEnabledChanged =
  function lssm_onPasscodeEnabledChanged(value) {
    if ('string' === typeof value) {
      this.lockScreenStates.passcodeEnabled = 'false' === value ? false : true;
    } else {
      this.lockScreenStates.passcodeEnabled = value;
    }
  };

  /**
   * After state transferring, the new state may generate new input and
   * we need to start another transferring with it.
   *
   * One cheat here: since we have do no-op in our transferring rules,
   * we would not get into the trouble of blocking main thread with the
   * infinite transferring loop.
   *
   * @param transferringOutput {object} - the output of the post transferring
   */
  LockScreenStateManager.prototype.onTransferringDone =
  function lssm_onTransferringDone(transferringOutput = {}) {
    var inputs = this.extend(this.lockScreenStates, transferringOutput);
    this.logger.debug('Transferring done; will transfer to new state');
    // Feed it as new input to do the transferring.
    this.transfer(inputs);
  };

  /**
   * When the state throw error while we transfer to it.
   */
  LockScreenStateManager.prototype.onTransferringError =
  function lssm_onTransferringError(error) {
    this.logger.error('There is an error during transferring',
      error, error.stack);
  };

  LockScreenStateManager.prototype.unobserveSettings =
  function lssm_unobserveSettings() {
    Object.keys(this.configs.observers).forEach((key) => {
      SettingsListener.unobserve(key, this.configs.observers[key]);
    });
  };

  LockScreenStateManager.prototype.ignoreEvents =
  function lssm_listenEvents() {
    this.configs.listenEvents.forEach((ename) => {
      window.removeEventListener(ename, this);
    });
  };

  LockScreenStateManager.prototype.stop =
  function lssm_stop() {
    this.unobserveSettings();
    this.ignoreEvents();
    this.logger.stop();
    return this;
  };

  /**
   * To register a new rule to transfer to.
   * See 'setupRules' to get the details of rules.
   *
   * @param conditions {object} - map of the LockScreen conditions
   * @param previousStateTypes {[string]} - in which state(s) we can transfer
   * @param newState {LockScreenState} - the target state instance
   * @param comment {string} - optional, to add comment for this rule
   */
  LockScreenStateManager.prototype.registerRule =
  function lssm_registerRule(conditions, previousStateTypes,
    newState, comment) {
    conditions.previous = previousStateTypes;
    conditions[':comment'] = comment;
    this.rules.set(conditions, newState);
  };

  /**
   * It would remove the rule if the conditions matched.
   *
   * @param states {object} - map of the LockScreen states
   * @param previousStateTypes {[string]} - in which state(s) we can transfer
   */
  LockScreenStateManager.prototype.unregisterRule =
  function lssm_unregisterRule(states, previousStateTypes) {
    // To prevent deletion while iterating.
    var matched;
    // Find what rule match the current LockScreen states.
    for (var [conditions, state] of this.rules) {  /* jshint unused: false */
      if (this.matchAcceptableState(conditions.previous, previousStateTypes) &&
          this.matchStates(conditions, states)) {
        matched = conditions;
        return;
      }
    }
    if (matched) {
      this.rules.delete(matched);
    }
  };

  /**
   * To check if one or multiple types of state is acceptable.
   *
   * @param acceptables {[string]} - all state types that can be accepted.
   * @param target {string|[string]} - the type(s) need to check
   */
  LockScreenStateManager.prototype.matchAcceptableState =
  function lssm_matchPrevious(acceptables, target) {
    if (!Array.isArray(target) &&
        -1 === acceptables.indexOf(target.type)) {
      this.logger.verbose(
        'Try to match conditions but failed: the target state ',
        target,
        ' is not in the list of acceptable states: ',
        acceptables);
      return false;
    } else if (Array.isArray(target)) {
      // If we want to exactly match them. This is required by the
      // 'unregisterRule' method.
      if (!this.arrayEqual(target, acceptables)) {
        return false;
      }
    }
    return true;
  };

  /**
   * To match the current states with the rule conditions.
   */
  LockScreenStateManager.prototype.matchStates =
  function lssm_matchStates(conditions, lockScreenStates) {
    return Object.keys(lockScreenStates).reduce((prev, key) => {
      var condition = conditions[key];
      // Rules can omit some condition, which means it can be anything.
      if ('undefined' === typeof condition) {
        return prev;
      }
      if (condition !== lockScreenStates[key]) {
        this.logger.verbose('Try to match conditions but failed: ', key,
          ' in conditions is ', condition,
          ' not ', lockScreenStates[key]);
        return false;
      }

      this.logger.verbose('Try to match conditions and success: ', key,
        ' in conditions is ', condition,
        ' match the ', lockScreenStates[key]);
      return prev;
    }, true);
  };

  /**
   * Extend an object with new one.
   * The 'neo' object would be overwritten with the key-value in the
   * existing object.
   *
   * This exists since we don't have a well-organized standard library,
   * and the 'shared' libraries is far from the ideal state, from the
   * management to the documenting aspects.
   *
   * @return {object}
   */
  LockScreenStateManager.prototype.extend =
  function lssm_extend(existing, neo) {
    for (var key in existing) {
      if ('undefined' === typeof neo[key]) {
        neo[key] = existing[key];
      }
    }
    return neo;
  };

  /**
   * Can only compare simple array with sortable things.
   * Required by the matcher of LockScreenStates.
   * See the 'matchStates' method.
   *
   * @param one {[sortable]}
   * @param two {[sortable]}
   */
  LockScreenStateManager.prototype.arrayEqual =
  function lssm_arrayEqual(one, two) {
    if (one.length !== two) {
      return false;
    }
    var sortedOne = one.sort(),
        sortedTwo = two.sort();
    return sortedOne.reduce((prevMatchResult, current, index) => {
      return prevMatchResult && (current === sortedTwo[index]);
    }, true);
  };

  exports.LockScreenStateManager = LockScreenStateManager;
})(window);
