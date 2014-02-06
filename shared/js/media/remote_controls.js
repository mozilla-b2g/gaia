'use strict';

/**
 * Media Remote Controls
 *
 * For media players, like music and video apps should support the capabilities
 * to receive and interact with the remote media commands from the connected
 * device/client, it might be a bluetooth device that supports A2DP and AVRCP,
 * or a remote client, such as the controls in Lock Screen/Utility tray, which
 * in the system app and uses the IAC.
 *
 * Since both AVRCP and IAC use system message to communication, this module
 * is designed for handling all the remote commands from system message. With
 * this module, players can just set the command listeners to the corresponding
 * commands, they might be the common media actions that a player should have,
 * so a player that uses this module doesn't need to write duplicate logic on
 * handling the same commands from the different requesters, and doesn't need
 * to care about where the requests are from.
 *
 * More, this module also handle the bluetooth states because to receive the
 * remote request or send the metadata and play status depends on the bluetooth
 * availability and the connection of A2DP, the player that uses the module
 * will automatically receive the requests or send the play information to the
 * remote client when the bluetooth states change.
 *
 */

// Commands for AVRCP.
var AVRCP = {
  PLAY_PRESS: 'media-play-button-press',
  PLAY_RELEASE: 'media-play-button-release',
  PAUSE_PRESS: 'media-pause-button-press',
  PAUSE_RELEASE: 'media-pause-button-release',
  PLAY_PAUSE_PRESS: 'media-play-pause-button-press',
  PLAY_PAUSE_RELEASE: 'media-play-pause-button-release',
  STOP_PRESS: 'media-stop-button-press',
  STOP_RELEASE: 'media-stop-button-release',
  NEXT_PRESS: 'media-next-track-button-press',
  NEXT_RELEASE: 'media-next-track-button-release',
  PREVIOUS_PRESS: 'media-previous-track-button-press',
  PREVIOUS_RELEASE: 'media-previous-track-button-release',
  FAST_FORWARD_PRESS: 'media-fast-forward-button-press',
  FAST_FORWARD_RELEASE: 'media-fast-forward-button-release',
  REWIND_PRESS: 'media-rewind-button-press',
  REWIND_RELEASE: 'media-rewind-button-release'
};

// Commands for Inter-App Communication.
var IAC = {
  PLAY_PRESS: 'play',
  PLAY_PAUSE_PRESS: 'playpause',
  PAUSE_PRESS: 'pause',
  STOP_PRESS: 'stop',
  NEXT_PRESS: 'nexttrack',
  PREVIOUS_PRESS: 'prevtrack',
  FAST_FORWARD_PRESS: 'fastforwardstart',
  FAST_FORWARD_RELEASE: 'fastforwardend',
  REWIND_PRESS: 'rewindstart',
  REWIND_RELEASE: 'rewindend'
};

// Commands for the players to register, events will be fired to the listeners.
var REMOTE_CONTROLS = {
  PLAY: 'play',
  PLAY_PAUSE: 'playpause',
  PAUSE: 'pause',
  STOP: 'stop',
  NEXT: 'next',
  PREVIOUS: 'previous',
  SEEK_PRESS: 'seekpress',
  SEEK_RELEASE: 'seekrelease',
  UPDATE_METADATA: 'updatemetadata',
  UPDATE_PLAYSTATUS: 'updateplaystatus'
};

/**
 * @constructor
 */
function MediaRemoteControls() {
  this.bluetooth = navigator.mozBluetooth;
  this.defaultAdapter = null;
  this._commandListeners = {};

  // Create the empty object for all command listeners.
  for (var command in REMOTE_CONTROLS)
    this._commandListeners[REMOTE_CONTROLS[command]] = [];
}

/**
 * Add the command listener so that it will be executed when the remote
 * commands fired.
 *
 * @param {String} command
 * @param {Object} listener
 */
MediaRemoteControls.prototype.addCommandListener = function(command, listener) {
  if (this._commandListeners[command])
    this._commandListeners[command].push(listener);
};

/**
 * Remove the command listener.
 *
 * @param {String} name
 * @param {Object} listener
 */
MediaRemoteControls.prototype.removeCommandListener = function(name, listener) {
  if (this._commandListeners[name]) {
    var index = -1;
    this._commandListeners[name].forEach(function(currListener, i) {
      if (currListener === listener)
        index = i;
    });

    if (index !== -1)
      this._commandListeners[name].splice(index, 1);
  }
};

/**
 * Start to listen to the system message and configure the bluetooth.
 */
MediaRemoteControls.prototype.start = function() {
  var self = this;

  // AVRCP commands use system message.
  navigator.mozSetMessageHandler(
    'media-button', this._commandHandler.bind(this)
  );

  // The bluetooth adapter will be needed to send metadata and play status
  // when those information are changed.
  if (this.bluetooth) {
    this.bluetooth.onadapteradded = initialDefaultAdapter;
    this.bluetooth.ondisabled = resetDefaultAdapter;
    // Get the default adapter at start because bluetooth might already enabled.
    initialDefaultAdapter();
  } else {
    console.warn('No mozBluetooth');
  }

  function initialDefaultAdapter() {
    var request = self.bluetooth.getDefaultAdapter();
    request.onsuccess = configureAdapter;
    request.onerror = resetDefaultAdapter;
  }

  function configureAdapter(event) {
    self.defaultAdapter = event.target.result;
    self.defaultAdapter.onrequestmediaplaystatus = playstatusHandler;
    self.defaultAdapter.ona2dpstatuschanged = a2dpConnectionHandler;
  }

  function playstatusHandler() {
    if (self._commandListeners['updateplaystatus'].length > 0)
      self._commandHandler(REMOTE_CONTROLS.UPDATE_PLAYSTATUS);
  }

  // A2DP is connected: update the status to the bluetooth device.
  // A2DP is disconnected: pause the player like the headphone is unplugged.
  function a2dpConnectionHandler(event) {
    var isConnected = event.status;
    if (isConnected && self._commandListeners['updatemetadata'].length > 0)
      self._commandHandler(REMOTE_CONTROLS.UPDATE_METADATA);
    else
      self._commandHandler(AVRCP.PAUSE_PRESS);
  }

  function resetDefaultAdapter() {
    self.defaultAdapter = null;
    // Do we need to do anything else?
  }

  this._queuedMessages = [];
  // Set up Inter-App Communications
  navigator.mozApps.getSelf().onsuccess = function() {
    var app = this.result;
    // If IAC doesn't exist, just bail out.
    if (!app.connect) {
      this._queuedMessages = null;
      return;
    }

    app.connect('mediacomms').then(function(ports) {
      self._ports = ports;
      self._ports.forEach(function(port) {
        port.onmessage = function(event) {
          self._commandHandler(event.data.command);
        };

        self._queuedMessages.forEach(function(message) {
          port.postMessage(message);
        });
      });
      self._queuedMessages = null;
    });
  };
};

MediaRemoteControls.prototype._postMessage = function(name, value) {
  var message = {type: name, data: value};
  if (!this._ports) {
    if (this._queuedMessages)
      this._queuedMessages.push(message);
  } else {
    this._ports.forEach(function(port) {
      port.postMessage(message);
    });
  }
};

/**
 * Convert the received messages to the REMOTE_CONTROLS commands, and create
 * custom event then pass the new event to the command listeners executer.
 *
 * @param {String} message
 */
MediaRemoteControls.prototype._commandHandler = function(message) {
  var type = 'remote';
  var option = {};

  switch (message) {
    case AVRCP.PLAY_PRESS:
    case IAC.PLAY_PRESS:
      option.detail = { command: REMOTE_CONTROLS.PLAY };
      break;
    case AVRCP.PLAY_PAUSE_PRESS:
    case IAC.PLAY_PAUSE_PRESS:
      option.detail = { command: REMOTE_CONTROLS.PLAY_PAUSE };
      break;
    case AVRCP.PAUSE_PRESS:
    case IAC.PAUSE_PRESS:
      option.detail = { command: REMOTE_CONTROLS.PAUSE };
      break;
    case AVRCP.STOP_PRESS:
    case IAC.STOP_PRESS:
      option.detail = { command: REMOTE_CONTROLS.STOP };
      break;
    case AVRCP.NEXT_PRESS:
    case IAC.NEXT_PRESS:
      option.detail = { command: REMOTE_CONTROLS.NEXT };
      break;
    case AVRCP.PREVIOUS_PRESS:
    case IAC.PREVIOUS_PRESS:
      option.detail = { command: REMOTE_CONTROLS.PREVIOUS };
      break;
    case AVRCP.FAST_FORWARD_PRESS:
    case IAC.FAST_FORWARD_PRESS:
      option.detail = { command: REMOTE_CONTROLS.SEEK_PRESS, direction: 1 };
      break;
    case AVRCP.REWIND_PRESS:
    case IAC.REWIND_PRESS:
      option.detail = { command: REMOTE_CONTROLS.SEEK_PRESS, direction: -1 };
      break;
    case AVRCP.FAST_FORWARD_RELEASE:
    case IAC.FAST_FORWARD_RELEASE:
    case AVRCP.REWIND_RELEASE:
    case IAC.REWIND_RELEASE:
      option.detail = { command: REMOTE_CONTROLS.SEEK_RELEASE };
      break;
    case REMOTE_CONTROLS.UPDATE_METADATA:
    case REMOTE_CONTROLS.UPDATE_PLAYSTATUS:
      option.detail = { command: message };
      break;
    default:
      return;
  }

  var event = new CustomEvent(type, option);
  this._executeCommandListeners(event);
};

/**
 * Fire the event to the command listeners.
 *
 * @param {Object} event
 */
MediaRemoteControls.prototype._executeCommandListeners = function(event) {
  if (!event.detail)
    return;

  this._commandListeners[event.detail.command].forEach(function(listener) {
    listener(event);
  });
};

MediaRemoteControls.prototype.notifyAppInfo = function(info) {
  // Send the app info via IAC.
  this._postMessage('appinfo', info);
};

/**
 * Send the updated metadata to the remote requester/receiver.
 *
 * @param {Object} metadata
 */
MediaRemoteControls.prototype.notifyMetadataChanged = function(metadata) {
  // Send the new metadata via bluetooth.
  if (this.defaultAdapter) {
    var request = this.defaultAdapter.sendMediaMetaData(metadata);

    request.onerror = function() {
      console.log('Sending Metadata error');
    };
  }

  // Now, send it via IAC.
  this._postMessage('nowplaying', metadata);
};

/**
 * Send the updated play status to the remote requester/receiver.
 *
 * @param {Object} status
 */
MediaRemoteControls.prototype.notifyStatusChanged = function(status) {
  // Send the new status via bluetooth.
  if (this.defaultAdapter) {
    var request = this.defaultAdapter.sendMediaPlayStatus(status);

    request.onerror = function() {
      console.log('Sending Playstatus error');
    };
  }

  // Now, send it via IAC.
  this._postMessage('status', status);
};
