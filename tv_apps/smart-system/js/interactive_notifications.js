/* global IACHandler */

(function(exports) {
  'use strict';

  var TYPE = {
    'NORMAL': 'notification',
    'ALERT': 'alert-notification'
  };

// =============== IAC Connector ====================================

  /**
   * IACConnector bridges notifications from IAC to InteractiveNotifications.
   * It only handles bridge staffes. All queuing features and priority features
   * are handled by InteractiveNotifications.
  **/
  function IACConnector() {
  }

  var iacProto = IACConnector.prototype;

  iacProto.start = function iac_start(notifier) {
    window.addEventListener('iac-interactivenotifications', this);
    this.notifier = notifier;
  };

  iacProto.stop = function iac_start() {
    window.removeEventListener('iac-interactivenotifications', this);
  };

  iacProto.handleEvent = function iac_handleEvent(evt) {
    var port = IACHandler.getPort('interactivenotifications');
    var detail = evt.detail;
    detail.message.onClosed = (function(button) {
      port.postMessage({
        'action': 'notification-closed',
        'id': detail.id,
        'type': detail.type,
        'message': detail.message,
        'button': button
      });
    }).bind(this);

    this.notifier.showNotification(detail.type, detail.message);
  };

// =============== Interacive Notifications ==========================

  function InteractiveNotifications() {
    this._activeMessage = null;
    this._activeType = null;
    this._activeTimeout = 0;
    this._pendingMessages = {};
    this._pendingMessages[TYPE.NORMAL] = [];
    this._pendingMessages[TYPE.ALERT] = [];
  }

  InteractiveNotifications.TYPE = Object.freeze(TYPE);

  var proto = InteractiveNotifications.prototype;

  proto.start = function in_start() {
    this._iacConnector = new IACConnector();
    this._iacConnector.start(this);
  };

  proto.stop = function in_stop() {
    this._iacConnector.stop();
  };

  proto.getAutoHideTimeout = function in_getAutoHideTimeout(type, hasButtons) {
    if (TYPE.NORMAL === type) {
      return hasButtons ? 8000 : 5000;
    } else {
      return 0;
    }
  };

  proto._updateNotificationUI = function in_updateNotificationUI(type, msg) {
    // TODO show the button and focus in notification buttons
    console.log(msg.text);
  };

  proto.showNotification = function in_showNotification(type, msg) {
    if (type === TYPE.ALERT &&
        this._activeType === TYPE.ALERT) {
      // already have one, just pending it.
      this._pendingMessages[TYPE.ALERT].push(msg);
    } else if (type === TYPE.NORMAL &&
               (this._activeType === TYPE.NORMAL ||
                this._activeType === TYPE.ALERT)) {
      // already have one, just pending it.
      this._pendingMessages[TYPE.NORMAL].push(msg);
    } else {
      // type === alert and _activeType is null or normal.
      // We show alert anyway and hide the normal one if one is shown.
      if (type === TYPE.ALERT && this._activeTimeout) {
        window.clearTimeout(this._activeTimeout);
        this._activeTimeout = 0;
        this.hideNotification(this._activeType, this._activeMessage);
      }

      var timeout = this.getAutoHideTimeout(type, msg.buttons);

      this._activeType = type;
      this._activeMessage = msg;
      this._updateNotificationUI(type, msg);
      if (timeout > 0) {
        this._activeTimeout = window.setTimeout((function autoHide() {
          this._activeTimeout = 0;
          this.hideNotification(type, msg);
        }).bind(this), timeout);
      }
    }
  };

  proto._showPendings = function in_showPendings() {
    var type, msg;
    if (this._pendingMessages[TYPE.ALERT].length) {
      type = TYPE.ALERT;
      msg = this._pendingMessages[type].shift();
    } else if (this._pendingMessages[TYPE.NORMAL].length) {
      type = TYPE.NORMAL;
      msg = this._pendingMessages[type].shift();
    }
    if (type && msg) {
      this.showNotification(type, msg);
      return true;
    } else {
      return false;
    }
  };

  proto.hideNotification = function in_hideNotification(type, msg, button) {
    if (this._activeType === type && this._activeMessage === msg) {
      if (msg.onClosed) {
        msg.onClosed(button);
      }
      this._activeType = null;
      this._activeMessage = null;
      var hasPending = this._showPendings();

      if (!hasPending && window.AppWindowManager &&
          AppWindowManager.getActiveApp()) {
        // If there is active app, we need to focus it back.
        AppWindowManager.getActiveApp().getTopMostWindow().focus();
      }
    } else {
      var queue = this._pendingMessages[type];
      var idx = queue.indexOf(msg);
      if (idx > -1) {
        var removed = queue.splice(idx, 1)[0];
        if (removed.onClosed) {
          removed.onClosed(button);
        }
      }
    }
  };

  exports.InteractiveNotifications = InteractiveNotifications;
}(window));
