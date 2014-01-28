/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * This widget will detect if it need to play the unlocking sound.
 */
(function(exports) {

  /**
   * @param {LockScreenMediator} mediator
   * @constructor LockScreenUnlockingSoundWidget
   * @arguments LockScreenBasicWidget
   */
  var LockScreenUnlockingSoundWidget = function(mediator) {
    window.LockScreenBasicWidget.call(this, mediator);
    this.setup();
    this.requestRegister();
  };

  /**
   * @borrows LockScreenBasicWidget.prototype as
   *          LockScreenUnlockingSoundWidget.prototype
   * @memberof LockScreenSlideWidget
   */
  LockScreenUnlockingSoundWidget.prototype =
    Object.create(window.LockScreenBasicWidget.prototype);

  /**
   * Set up the prototype of this instance.
   *
   * @this {LockScreenUnlockingSoundWidget}
   * @member LockScreenUnlockingSoundWidget
   */
  LockScreenUnlockingSoundWidget.prototype.setup =
  function lsusw_setup() {
    this.states = {
      observeSettings: false,
      soundEnabled: false
    };

    this.configs = {
      // When these states get changed, will do some action.
      concernStates: ['will-unlock'],
      name: 'UnlockingSound',
      // TODO: customizable unlocking sound?
      soundFileURL: './resources/sounds/unlock.opus'
    };
  };

  /**
   * Overwrite the default notify function to dispatch and handle them.
   *
   * @param {any} message
   * @param {string} channel - (optional)
   * @this {LockScreenSlideWidget}
   * @member LockScreenSlideWidget
   */
  LockScreenUnlockingSoundWidget.prototype.notify =
  function lsusw_notify(message, channel) {
    if ('stateChanged' === message.type &&
        'locked' === message.content.name &&
        'will-unlock' === message.content.newVal) {
      this.playSound();
      this.deactivate();
    }
  };

  /**
   * Activate this widget.
   * Will start to listen the setting value to decide to
   * play the sound or not while unlocking.
   *
   * @this {LockScreenSlideWidget}
   * @member LockScreenSlideWidget
   */
  LockScreenUnlockingSoundWidget.prototype.activate =
  function lsusw_activate() {
    this.super('activate')();

    // Already set observer. Because it's no way to cancel
    // a observer according to the listener's APIs.
    if (this.states.observeSettings) {
      return;
    }
    this.states.observeSettings = true;
    window.SettingsListener.observe('lockscreen.unlock-sound.enabled',
      true, (value) => {
      this.setSoundEnabled(value);
    });
  };

  /**
   * Deactivate this widget.
   *
   * @this {LockScreenSlideWidget}
   * @member LockScreenSlideWidget
   */
  LockScreenUnlockingSoundWidget.prototype.deactivate =
  function lsusw_deactivate() {
    this.super('deactivate')();
  };

  /**
   * To play the sound.
   *
   * @this LockScreenUnlockingSoundWidget
   * @memberof {LockScreenUnlockingSoundWidget}
   */
  LockScreenUnlockingSoundWidget.prototype.playSound =
  function lsusw_playSound() {
    if (this.states.soundEnabled) {
      var unlockAudio = new Audio(this.configs.soundFileURL);
      unlockAudio.play();
    }
  };

  /**
   * Wrapped mwthod to enable the sound from (maybe) string or boolean value.
   *
   * @param {string|boolean} val
   * @this LockScreenUnlockingSoundWidget
   * @memberof {LockScreenUnlockingSoundWidget}
   */
  LockScreenUnlockingSoundWidget.prototype.setSoundEnabled =
  function lsusw_setSoundEnabled(val) {
    if (typeof val === 'string') {
      this.states.soundEnabled = val == 'false' ? false : true;
    } else {
      this.states.soundEnabled = val;
    }
  };

  /** @global LockScreenUnlockingSoundWidget */
  exports.LockScreenUnlockingSoundWidget = LockScreenUnlockingSoundWidget;
})(window);
