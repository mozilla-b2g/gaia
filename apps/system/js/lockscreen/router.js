/**
 * LockScreenRouter: would convert all related messages from IAC or
 * WebAPIs to LockScreen nofitications, and the LockScreenMediator
 * would pass them to the all widgets. Note that only some limited
 * WebAPIs would be forwarded via this way. Other APIs should be
 * directly manipulated by widgets themselves.
 *
 * It's the public interface of LockScreen. No messages should be
 * received and forwarded by widgets and the mediator via other
 * interfaces.
 *
 * Message from router to widget:
 *
 * IAC/WebAPIs -> mediator#forward -> mediator#broadcast -> widget#notify
 *
 * Message from widget to router:
 *
 * widget#post -> mediator#post -> router#post -> IAC
 *
 * Some messages can be turned into WebAPIs. In such case, the message post
 * by widgets may not directly spread out via IAC, but the router would
 * do the convertion and fire some WebAPI actions:
 *
 * widget#post -> mediator#post -> router#post -> WebAPI action
 *
 * So the widgets should not guess that way the router would post their
 * messages. All they need to know is to post messages with (if they need)
 * the right channel.
 */
(function(exports) {
  'use strict';

  const DEBUG = true;

  /**
   * @param {LockScreenMediator} mediator
   * @constructor LockScreenRouter
   */
  var LockScreenRouter = function(mediator) {
    this.setup();

    this.mediator = mediator;
    this.startListenMessage();
    navigator.mozApps.getSelf().onsuccess = (evt) => {
      this.app = evt.target.result;
    };
  };

  /**
   * Set up the prototype of this instance.
   *
   * @this {LockScreenWidgetFactory}
   * @member LockScreenWidgetFactory
   */
  LockScreenRouter.prototype.setup = function() {
    this.app = null;  // For IAC ports.
    this.mediator = null;
    this.configs = {
      // The channel name would be prefixed with 'iac-' when we register it
      // on the IAC handler. But within router and the mediator, channel would
      // come without the prefix.
      channels: [
        'mediacomms'  // Media playing info.
      ]
    };
  };

  /**
   * Handle events including IAC messages.
   *
   * @param {event} evt
   * @this {LockScreenRouter}
   * @member LockScreenRouter
   */
  LockScreenRouter.prototype.handleEvent =
  function lsr_handleEvent(evt) {
    var match = evt.type.match(/^iac-(\w+)/);
    if (!match) {
      return;
    }
    var channel = match[1];
    var message = evt.detail;
    this.forward(message, channel);
  };

  /**
   * Prepare to forward any messages from the outside world.
   *
   * @this {LockScreenRouter}
   * @member LockScreenRouter
   */
  LockScreenRouter.prototype.startListenMessage =
  function lsr_startListenMessage() {
    // Register IAC channels.
    // This need IAC helper library to simplify the interface.
    this.configs.channels.forEach((channel) => {
      window.addEventListener('iac-' + channel, this);
    });
  };

  /**
   * Stop forwarding any messages from the outside world.
   *
   * @this {LockScreenRouter}
   * @member LockScreenRouter
   */
  LockScreenRouter.prototype.stopListenMessage =
  function lsr_stopListenMessage() {
    this.configs.channels.forEach((channel) => {
      window.removeEventListener('iac-' + channel, this);
    });
  };

  /**
   * Forward message to the mediator, which would continue to broadcast
   * to widgets.
   *
   * @param {any} message
   * @param {string} channel - (optional)
   * @this {LockScreenRouter}
   * @member LockScreenRouter
   */
  LockScreenRouter.prototype.forward =
  function lsr_forward(message, channel) {
    this.mediator.broadcast(message, channel);
  };

  /**
   * Asynchrnously post a message.
   * Please read the comments at the head of this file.
   * If channel is undefined, will broadcast to all channels.
   * If channel is an array, will only broadcast to some channels.
   *
   * @param {any} message
   * @param {string} channel - (optional)
   * @this {LockScreenRouter}
   * @member LockScreenRouter
   */
  LockScreenRouter.prototype.post =
  function lsr_post(message, channel) {

    var doPost = (channel) => {
      this.app.connect(channel).then((ports) => {
        ports.forEach((port)=> {
          port.postMessage(message);
          this.debug('>> message posted: ', message);
        }, (reason)=> {
          throw new Error('Can\'t connect to channel: ' + channel +
            '; reason: ' + reason);
        });
      });
    };

    if ('undefined' !== typeof channel &&
        !Array.isArray(channel) &&
        -1 === this.configs.channels.indexOf(channel)) {
      this.debug('>> post to an undefined channel', channel);
      return;
    }
    else if ('undefined' === typeof channel) {
      this.configs.channels.forEach(doPost);
    }
    else if (Array.isArray(channel)) {
      channel.forEach((ch) => {
        if (-1 === this.configs.channels.indexOf(ch)) {
          this.debug('>> post to an undefined channel', ch);
        } else {
          doPost(ch);
        }
      });
    }
    else {
      doPost(channel);
    }
  };

  /**
   * Print debug message if the flag is true.
   *
   * @param {any} - any arguments in any length
   * @this {LockScreenRouter}
   * @member LockScreenRouter
   */
  LockScreenRouter.prototype.debug = function() {
    if (DEBUG) {
      console.log.apply(console, Array.prototype.slice.call(arguments, 0));
    }
  };

  /** @global LockScreenRouter */
  exports.LockScreenRouter = LockScreenRouter;
})(window);
