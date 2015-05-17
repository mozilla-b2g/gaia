/* global IACHandler, SimpleKeyNavigation, KeyEvent, focusManager */

(function(exports) {
  'use strict';

  function $(id) {
    return document.getElementById(id);
  }

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

    this._banner = $('notification-container');
    this._banner.setAttribute('aria-hidden', 'true');
    this._banner.tabIndex = -1;
    focusManager.addUI(this);
  }

  InteractiveNotifications.TYPE = Object.freeze(TYPE);

  var proto = InteractiveNotifications.prototype;

  proto.start = function in_start() {
    this._iacConnector = new IACConnector();
    this._iacConnector.start(this);
    // This handles left and right. We start this module only when we really
    // need it.
    this._keyNavigator = new SimpleKeyNavigation();

    this.initEvents();
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

  proto.initEvents = function in_initEvents() {
    var self = this;
    ['notification-button-0', 'notification-button-1'].forEach(function(b) {
      $(b).addEventListener('click', self);
    });

    // We don't need mozbrowserkeyXXX here because we change the focus back to
    // system app while a notification is shown. And there is no need to handle
    // back key in other cases.
    window.addEventListener('keyup', this);

    this._banner.addEventListener('hidden', this);
    this._banner.on('opened', this._focusNotification.bind(this));
  };

  proto.handleEvent = function in_handleEvent(e) {
    switch(e.type) {
      case 'click':
        switch(e.target.id) {
          case 'notification-button-0':
          case 'notification-button-1':
            this.hideNotification(this._activeType, this._activeMessage,
                                  e.target.dataset.buttonId);
            break;
        }
        break;
      case 'keyup':
        this._handleKeyEvent(e);
        break;
      case 'hidden':
        this.onHide();
        this._banner.classList.add('hidden');
        this._showPendings();
        break;
    }
  };

  proto._handleKeyEvent = function in_handleKeyEvent(e) {
    switch(e.keyCode) {
      case KeyEvent.DOM_VK_ESCAPE:
      case KeyEvent.DOM_VK_BACK_SPACE:
        if (this._activeMessage) {
          this.hideNotification(this._activeType, this._activeMessage);
        }
        break;
    }
  },

  proto._updateNotificationUI = function in_updateNotificationUI(type, msg) {
    var banner = this._banner;
    var title = $('notification-title');
    var text = $('notification-body');
    var buttonGroup = $('notification-button-group');
    var buttonImg;
    var buttons = [$('notification-button-0'), $('notification-button-1')];

    banner.dataset.type = type;
    // XXX: We don't have default icon for notification. Change to correct one
    //      once we have it.
    banner.style.backgroundImage = msg.icon ? 'url("' + msg.icon + '")':
                                   'url("/style/icons/system_84.png")';
    title.textContent = msg.title ? msg.title : '';
    banner.classList[msg.title ? 'add' : 'remove']('has-title');
    text.textContent = msg.text ? msg.text : '';

    if (msg.buttons && msg.buttons.length) {
      buttonGroup.classList.remove('hidden');
      // We only have two buttons at most.
      for (var i = 0; i < buttons.length; i++) {
        if (msg.buttons[i]) {
          buttons[i].dataset.buttonId = msg.buttons[i].id;
          buttons[i].innerHTML = '';
          if (msg.buttons[i].icon) {
            buttonImg = document.createElement('img');
            buttonImg.src = msg.buttons[i].icon;
            buttons[i].appendChild(buttonImg);
          }
          if (msg.buttons[i].label) {
            buttons[i].textContent = msg.buttons[i].label;
          }
          buttons[i].classList.remove('hidden');
        } else {
          buttons[i].classList.add('hidden');
        }
      }
    } else {
      buttonGroup.classList.add('hidden');
    }

    banner.classList.remove('hidden');
    banner.flyOpen();
  };

  proto._focusNotification = function in_focusNotification() {
    this._banner.removeAttribute('aria-hidden');
    if (this._activeMessage.buttons && this._activeMessage.buttons.length > 0) {
      // KeyNavigator will auto-focus the first item at the start. It calls
      // focus() for us when the focus switches to another button.
      this._keyNavigator.start([$('notification-button-0'),
                                $('notification-button-1')],
                               SimpleKeyNavigation.DIRECTION.HORIZONTAL,
                               {target: this._banner});
    }
    focusManager.focus();
  };

  proto.focus = function in_focus() {
    if (this.isFocusable()) {
      document.activeElement.blur();
      this._activeMessage.buttons ?
                        this._keyNavigator.focus() : this._banner.focus();
    }
  };

  proto.isFocusable = function in_isFocusable() {
    return !!this._activeMessage;
  };

  proto.getElement = function in_getElement() {
    if (this.isFocusable()) {
      return this._banner;
    }
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
    } else if (type === TYPE.ALERT && this._activeMessage) {
      // type === alert and _activeType is null or normal.
      // We show alert anyway and hide the normal one if one is shown.
      window.clearTimeout(this._activeTimeout);
      this._activeTimeout = 0;
      this._pendingMessages[TYPE.ALERT].push(msg);
      this.hideNotification(this._activeType, this._activeMessage);
    } else {
      var timeout = this.getAutoHideTimeout(type, msg.buttons &&
                                                  msg.buttons.length > 0);

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

  proto.hasPendings = function in_hasPendings() {
    return this._pendingMessages[TYPE.ALERT].length ||
           this._pendingMessages[TYPE.NORMAL].length;
  };

  proto.onHide = function in_onHide() {
    if (this._activeMessage.onClosed) {
      this._activeMessage.onClosed(this._activeMessage.closedBy);
    }

    if (this._activeMessage.buttons &&
        this._activeMessage.buttons.length > 0) {
      // We need to stop KeyNavigator while we don't need it.
      this._keyNavigator.stop();
    }

    if (!this.hasPendings()) {
      focusManager.focus();
    }

    this._activeType = null;
    this._activeMessage = null;
  };

  proto.hideNotification = function in_hideNotification(type, msg, button) {
    if (this._activeType === type && this._activeMessage === msg) {
      this._banner.setAttribute('aria-hidden', 'true');
      this._activeMessage.closedBy = button;
      this._banner.hide();
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
    focusManager.focus();
  };

  exports.InteractiveNotifications = InteractiveNotifications;
}(window));
