/* global LazyLoader, MediaPlaybackWidget, Service,
          SettingsListener, SettingsURL, toneUpgrader */
'use strict';


var NotificationScreen = {
  name: 'NotificationScreen',
  TOASTER_TIMEOUT: 3500,
  TRANSITION_FRACTION: 0.30,
  TRANSITION_DURATION: 200,
  SWIPE_INERTIA: 100,
  TAP_THRESHOLD: 10,
  SCROLL_THRESHOLD: 10,
  CLEAR_DELAY: 80,

  _notification: null,
  _containerWidth: null,
  _touchStartX: 0,
  _touchStartY: 0,
  _touchPosX: 0,
  _touching: false,
  _isTap: false,
  _toasterTimeout: null,

  lockscreenPreview: true,
  silent: false,
  vibrates: true,
  isResending: false,
  resendReceived: 0,
  resendExpecting: 0,

  /* These applications' notifications will be added in the "priority"
   * notification group
   */
  PRIORITY_APPLICATIONS: [
    window.location.origin.replace('system.', 'network-alerts.') +
      '/manifest.webapp'
  ],

  /* These applications' notifications will not be notified, it means we won't
   * have:
   * - the banner
   * - the vibration
   * - the sound
   */
  SILENT_APPLICATIONS: [
    window.location.origin.replace('system.', 'network-alerts.') +
      '/manifest.webapp'
  ],

  getLockScreenContainer: function ns_getLockScreenContainer() {
    // XXX: Bug 1057198 add this as a workaround before we truly
    // make LockScreen as an app.
    var lw = Service.query('LockScreenWindowManager.getInstance');
    if (lw && lw.getNotificationContainer()) {
      return lw.getNotificationContainer();
    } else {
      return null;
    }
  },

  start: function() {
    window.addEventListener('mozChromeNotificationEvent', this);
    this.notificationsContainer =
      document.getElementById('notifications-container');
    this.container =
      document.getElementById('desktop-notifications-container');
    this.lockScreenContainer = this.getLockScreenContainer();
    this.toaster = document.getElementById('notification-toaster');
    this.ambientIndicator = document.getElementById('ambient-indicator');
    this.toasterIcon = document.getElementById('toaster-icon');
    this.toasterTitle = document.getElementById('toaster-title');
    this.toasterDetail = document.getElementById('toaster-detail');
    this.clearAllButton = document.getElementById('notification-clear');

    ['tap', 'touchstart', 'touchmove', 'touchend', 'touchcancel', 'wheel'].
      forEach(function(evt) {
        this.container.addEventListener(evt, this);
        this.toaster.addEventListener(evt, this);
      }, this);

    this.clearAllButton.addEventListener('click', this.clearAll.bind(this));

    // will hold the count of external contributors to the notification
    // screen
    this.externalNotificationsCount = 0;
    this.unreadNotifications = [];

    window.addEventListener('utilitytrayshow', this);
    // Since UI expect there is a slight delay for the opened notification.
    window.addEventListener('lockscreen-appclosed', this);
    window.addEventListener('visibilitychange', this);
    window.addEventListener('ftuopen', this);
    window.addEventListener('ftudone', this);
    window.addEventListener('desktop-notification-resend', this);

    this._sound = 'style/notifications/ringtones/notifier_firefox.opus';

    // set up the media playback widget, but only if |MediaPlaybackWidget| is
    // defined (we don't define it in tests)
    LazyLoader.load(['js/media_playback.js']).then(function() {
      this.mediaPlaybackWidget = new MediaPlaybackWidget(
        document.getElementById('media-playback-container'),
        {nowPlayingAction: 'openapp'});
    }.bind(this))['catch'](function(err) {
      console.error(err);
    });

    var self = this;
    SettingsListener.observe('notification.ringtone', '', function(value) {
      LazyLoader.load(['shared/js/settings_url.js']).then(function() {
        if (!self.ringtoneURL) {
          self.ringtoneURL = new SettingsURL();
        }
        self._sound = self.ringtoneURL.set(value);
      })['catch'](function(err) {
        console.error(err);
      });
    });

    // We have new default ringtones in 2.0, so check if the version is upgraded
    // then execute the necessary migration.
    if (Service.query('justUpgraded')) {
      LazyLoader.load('js/tone_upgrader.js').then(function() {
        toneUpgrader.perform('alerttone');
      })['catch'](function(err) {
        console.error(err);
      });
    }
    Service.register('clearAll', this);
    Service.register('addUnreadNotification', this);
    Service.register('removeUnreadNotification', this);
  },

  handleEvent: function ns_handleEvent(evt) {
    switch (evt.type) {
      case 'mozChromeNotificationEvent':
        var detail = evt.detail;
        switch (detail.type) {
          case 'desktop-notification':
            this.addNotification(detail);
            if (this.isResending) {
              this.resendReceived++;
              this.isResending = (this.resendReceived < this.resendExpecting);
            }
            break;
          case 'desktop-notification-close':
            this.removeNotification(detail.id);
            break;
        }
        break;
      case 'tap':
        var target = evt.target;
        this.tap(target);
        break;
      case 'touchstart':
        this.touchstart(evt);
        break;
      case 'touchmove':
        this.touchmove(evt);
        break;
      case 'touchend':
        this.touchend(evt);
        break;
      case 'touchcancel':
        this.touchcancel(evt);
        break;
      case 'wheel':
        this.wheel(evt);
        break;
      case 'utilitytrayshow':
        this.updateTimestamps();
        this.hideNotificationIndicator();
        break;
      case 'visibilitychange':
        //update timestamps in lockscreen notifications
        if (!document.hidden) {
          this.updateTimestamps();
        }
        break;
      case 'ftuopen':
        this.toaster.removeEventListener('tap', this);
        break;
      case 'ftudone':
        this.toaster.addEventListener('tap', this);
        this.updateNotificationIndicator();
        break;
      case 'desktop-notification-resend':
        this.resendExpecting = evt.detail.number;
        if (this.resendExpecting) {
          this.isResending = true;
        }
        break;
      case 'lockscreen-appclosed':
        // UX require to delay to clear notifications from
        // LockScreen for the actionable LockScreen notifications.
        setTimeout((function() {
          this.clearLockScreen();
        }).bind(this), 400);
        break;
    }
  },

  cancelSwipe: function ns_cancelSwipe() {
    var notification = this._notification;
    this._notification = null;

    // If the notification has been moved, animate it back to its original
    // position.
    if (this._touchPosX) {
      notification.addEventListener('transitionend',
        function trListener() {
          notification.removeEventListener('transitionend', trListener);
          notification.classList.remove('snapback');
        });
      notification.classList.add('snapback');
    }

    notification.style.transform = '';
  },

  // Swipe handling
  touchstart: function ns_touchstart(evt) {
    if (evt.touches.length !== 1) {
      if (this._touching) {
        this._touching = false;
        this.cancelSwipe();
      }
      return;
    }

    var target = evt.touches[0].target;
    if (!target.dataset.notificationId) {
      return;
    }

    this._notification = target;
    this._containerWidth = this.container.clientWidth;
    this._touchStartX = evt.touches[0].pageX;
    this._touchStartY = evt.touches[0].pageY;
    this._touchPosX = 0;
    this._touchStartTime = evt.timeStamp;
    this._touching = true;
    this._isTap = true;
  },

  touchmove: function ns_touchmove(evt) {
    if (!this._touching) {
      return;
    }

    var touchDiffY = evt.touches[0].pageY - this._touchStartY;

    // The notification being touched is the toast
    if (this._notification.classList.contains('displayed')) {
      this._touching = false;
      if (touchDiffY < 0) {
        this.closeToast();
      }
      return;
    }

    if (evt.touches.length !== 1 ||
        (this._isTap && Math.abs(touchDiffY) >= this.SCROLL_THRESHOLD)) {
      this._touching = false;
      this.cancelSwipe();
      return;
    }

    this._touchPosX = evt.touches[0].pageX - this._touchStartX;
    if (Math.abs(this._touchPosX) >= this.TAP_THRESHOLD) {
      this._isTap = false;
      this.notificationsContainer.style.overflow = 'hidden';
    }
    if (!this._isTap) {
      evt.preventDefault();
      this._notification.style.transform =
        'translateX(' + this._touchPosX + 'px)';
    }
  },

  touchend: function ns_touchend(evt) {
    if (!this._touching) {
      return;
    }

    evt.preventDefault();
    this._touching = false;

    this.notificationsContainer.style.overflow = '';

    if (this._isTap) {
      var event = new CustomEvent('tap', {
        bubbles: true,
        cancelable: true
      });
      this._notification.dispatchEvent(event);
      this._notification = null;
      return;
    }

    // Taking speed into account to detect swipes
    var deltaT = evt.timeStamp - this._touchStartTime;
    var speed = this._touchPosX / deltaT;
    var inertia = speed * this.SWIPE_INERTIA;
    var finalDelta = Math.abs(this._touchPosX + inertia);

    if (finalDelta >
        this._containerWidth * this.TRANSITION_FRACTION) {
      if (this._touchPosX < 0) {
        this._notification.classList.add('left');
      }

      var durationLeft = (1 - (finalDelta / this._containerWidth)) *
                         this.TRANSITION_DURATION;
      this.swipeCloseNotification(durationLeft);
    } else {
      this.cancelSwipe();
    }
  },

  touchcancel: function ns_touchcancel(evt) {
    if (this._touching) {
      evt.preventDefault();
      this._touching = false;
      this.cancelSwipe();
    }
  },

  wheel: function ns_wheel(evt) {
    if (evt.deltaMode === evt.DOM_DELTA_PAGE && evt.deltaX) {
      this._notification = evt.target;
      this.swipeCloseNotification();
    }
  },

  tap: function ns_tap(node) {
    var notificationId = node.dataset.notificationId;
    var notificationNode = this.container.querySelector(
      '[data-notification-id="' + notificationId + '"]');

    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('mozContentNotificationEvent', true, true, {
      type: 'desktop-notification-click',
      id: notificationId
    });
    window.dispatchEvent(event);

    window.dispatchEvent(new CustomEvent('notification-clicked', {
      detail: {
        id: notificationId
      }
    }));

    // Desktop notifications are removed when they are clicked (see bug 890440)
    if (notificationNode &&
        notificationNode.dataset.type === 'desktop-notification' &&
        notificationNode.dataset.obsoleteAPI === 'true') {
      this.closeNotification(notificationNode);
    }

    if (node == this.toaster) {
      this.closeToast();
    } else {
      Service.request('UtilityTray:hide');
    }
  },

  updateTimestamps: function ns_updateTimestamps() {
    var timestamps = document.getElementsByClassName('timestamp');
    for (var i = 0, l = timestamps.length; i < l; i++) {
      timestamps[i].textContent =
        this.prettyDate(new Date(timestamps[i].dataset.timestamp));
    }
  },

  /**
   * Display a human-readable relative timestamp.
   */
  prettyDate: function prettyDate(time) {
    var date;
    if (navigator.mozL10n) {
      date = navigator.mozL10n.DateTimeFormat().fromNow(time, true);
    } else {
      date = time.toLocaleFormat();
    }
    return date;
  },

  updateToaster: function ns_updateToaster(detail, type, dir) {
    if (detail.icon) {
      this.toasterIcon.src = detail.icon;
      this.toasterIcon.hidden = false;
    } else {
      this.toasterIcon.hidden = true;
    }

    this.toaster.dataset.notificationId = detail.id;
    this.toaster.dataset.type = type;
    this.toaster.lang = detail.lang;
    this.toaster.dir = dir;

    this.toasterTitle.textContent = detail.title;
    this.toasterDetail.textContent = detail.text;
  },

  addNotification: function ns_addNotification(detail) {
    // LockScreen window may not opened while this singleton got initialized.
    this.lockScreenContainer = this.getLockScreenContainer();

    var manifestURL = detail.manifestURL || '';
    var behavior = detail.mozbehavior || {};
    var isPriorityNotification =
      this.PRIORITY_APPLICATIONS.indexOf(manifestURL) !== -1;

    var notificationContainer =
      (isPriorityNotification) ?
      this.container.querySelector('.priority-notifications') :
      this.container.querySelector('.other-notifications');

    /* If dir "auto" was specified by the notification,
     * use document direction instead because dir="auto"
     * does not align the notification node according to
     * the system language direction but instead it aligns
     * every child element according to its own language
     * which creates a UI mess we can't control by changing
     * the system language.
     */
    var dir = (detail.dir === 'auto' || typeof detail.dir === 'undefined') ?
      document.documentElement.dir : detail.dir;

    // We need to animate the ambient indicator when the toast
    // timesout, so we skip updating it here, by passing a skip bool
    this.addUnreadNotification(detail.id, true);

    var notificationNode = document.createElement('div');
    notificationNode.classList.add('notification');
    notificationNode.setAttribute('role', 'link');

    notificationNode.dataset.notificationId = detail.id;
    notificationNode.dataset.noClear = behavior.noclear ? 'true' : 'false';
    notificationNode.lang = detail.lang;
    notificationNode.dataset.predefinedDir = detail.dir;

    notificationNode.dataset.obsoleteAPI = 'false';
    if (typeof detail.id === 'string' &&
        detail.id.indexOf('app-notif-') === 0) {
      notificationNode.dataset.obsoleteAPI = 'true';
    }
    var type = detail.type || 'desktop-notification';
    notificationNode.dataset.type = type;
    notificationNode.dataset.manifestURL = manifestURL;
    var icon;
    if (detail.icon) {
      icon = document.createElement('img');
      icon.src = detail.icon;
      icon.setAttribute('role', 'presentation');
      notificationNode.appendChild(icon);
    }

    var titleContainer = document.createElement('div');
    titleContainer.classList.add('title-container');

    var title = document.createElement('div');
    title.classList.add('title');
    title.textContent = detail.title;
    title.setAttribute('dir', 'auto');

    titleContainer.appendChild(title);

    var time = document.createElement('span');
    var timestamp = detail.timestamp ? new Date(detail.timestamp) : new Date();
    time.classList.add('timestamp');
    time.dataset.timestamp = timestamp;
    time.textContent = this.prettyDate(timestamp);
    titleContainer.appendChild(time);

    notificationNode.appendChild(titleContainer);

    var message = document.createElement('div');
    message.classList.add('detail');
    var messageContent = document.createElement('div');
    messageContent.classList.add('detail-content');
    messageContent.textContent = detail.text;
    messageContent.setAttribute('dir', 'auto');
    message.appendChild(messageContent);
    notificationNode.appendChild(message);

    var notifSelector = '[data-notification-id="' + detail.id + '"]';
    var oldNotif = notificationContainer.querySelector(notifSelector);
    if (oldNotif) {
      // The whole node cannot be replaced because CSS animations are re-started
      oldNotif.replaceChild(titleContainer,
        oldNotif.querySelector('.title-container'));
      oldNotif.replaceChild(message, oldNotif.querySelector('.detail'));
      var oldIcon = oldNotif.querySelector('img');
      if (icon) {
        oldIcon ? oldIcon.src = icon.src : oldNotif.insertBefore(icon,
                                                           oldNotif.firstChild);
      } else if (oldIcon) {
        oldNotif.removeChild(oldIcon);
      }
      // but we still need to update type, lang and dir.
      oldNotif.dataset.type = type;
      oldNotif.lang = detail.lang;
      oldNotif.dataset.predefinedDir = detail.dir;

      notificationNode = oldNotif;
    } else {
      notificationContainer.insertBefore(notificationNode,
          notificationContainer.firstElementChild);
    }

    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('mozContentNotificationEvent', true, true, {
      type: 'desktop-notification-show',
      id: detail.id
    });
    window.dispatchEvent(event);

    // We turn the screen on if needed in order to let
    // the user see the notification toaster
    if (!behavior.noscreen && !Service.query('screenEnabled')) {
      Service.request('turnScreenOn');
    }

    var notify = !('noNotify' in detail) &&
      // don't notify for network-alerts notifications
      (this.SILENT_APPLICATIONS.indexOf(manifestURL) === -1);

    // Notification toaster
    if (notify) {
      this.updateToaster(detail, type, dir);
      if (this.lockscreenPreview || !window.Service.query('locked')) {
        this.toaster.classList.add('displayed');

        if (this._toasterTimeout) {
          clearTimeout(this._toasterTimeout);
        }

        this._toasterTimeout = setTimeout((function() {
          this.closeToast();
          this._toasterTimeout = null;
        }).bind(this), this.TOASTER_TIMEOUT);
      }
    }

    // Adding it to the lockscreen if locked and the privacy setting
    // does not prevent it.
    if (Service.query('locked') && this.lockscreenPreview) {
      this.addLockScreenNotification(detail.id,
        notificationNode.cloneNode(true));
    }

    if (notify && !this.isResending) {
      if (!this.silent) {
        var ringtonePlayer = new Audio();
        var telephony = window.navigator.mozTelephony;

        ringtonePlayer.src = behavior.soundFile || this._sound;

        if (telephony && telephony.active) {
          ringtonePlayer.mozAudioChannelType = 'telephony';
          ringtonePlayer.volume = 0.3;
        } else {
          ringtonePlayer.mozAudioChannelType = 'notification';
        }
        ringtonePlayer.play();
        window.setTimeout(function smsRingtoneEnder() {
          ringtonePlayer.pause();
          ringtonePlayer.removeAttribute('src');
          ringtonePlayer.load();
        }, 4000);
      }

      if (this.vibrates) {
        var pattern = [200, 200, 200];
        if (behavior.vibrationPattern && behavior.vibrationPattern.length &&
            behavior.vibrationPattern[0] > 0) {
          pattern = behavior.vibrationPattern;
        }

        if (document.hidden) {
          // bug 1030310: disable vibration for the email app when asleep
          // bug 1050023: disable vibration for downloads when asleep
          if (type.indexOf('download-notification-downloading') === -1 &&
              manifestURL.indexOf('email.gaiamobile.org') === -1) {
            window.addEventListener('visibilitychange', function waitOn() {
              window.removeEventListener('visibilitychange', waitOn);
              navigator.vibrate(pattern);
            });
          }
        } else {
          navigator.vibrate(pattern);
        }
      }
    }

    // must be at least one notification now
    this.clearAllButton.disabled = false;

    return notificationNode;
  },

  /**
   * Give a notification node and add it to LockScreen via event.
   */
  addLockScreenNotification: function ns_addLockScreenNotification(id, node) {
    window.dispatchEvent(
      new window.CustomEvent('lockscreen-notification-request-append', { detail:
        {
          id: id,
          node: node
        }
      }));
  },

  swipeCloseNotification: function ns_swipeCloseNotification(duration) {
    var notification = this._notification;
    this._notification = null;

    var toaster = this.toaster;
    var self = this;
    notification.addEventListener('transitionend', function trListener() {
      notification.removeEventListener('transitionend', trListener);

      self.closeNotification(notification);

      if (notification != toaster) {
        return;
      }

      // Putting back the toaster in a clean state for the next notification
      toaster.style.display = 'none';
      setTimeout(function nextLoop() {
        toaster.style.MozTransition = '';
        toaster.style.MozTransform = '';
        toaster.classList.remove('displayed');
        toaster.classList.remove('disappearing');

        setTimeout(function nextLoop() {
          toaster.style.display = 'block';
        });
      });
    });

    notification.classList.add('disappearing');
    duration = duration || this.TRANSITION_DURATION;
    notification.style.transitionDuration = duration + 'ms';
    notification.style.transform = '';
  },

  addUnreadNotification: function ns_addUnreadNotification(id, skipUpdate) {
    if (Service.query('UtilityTray.shown')) {
      return;
    }
    this.unreadNotifications.push(id);
    if (!skipUpdate) {
      this.updateNotificationIndicator();
    }
  },

  removeUnreadNotification: function ns_removeUnreadNotification(id) {
    var notifIndex = this.unreadNotifications.indexOf(id);
    if (notifIndex > -1) {
      this.unreadNotifications.splice(notifIndex, 1);
    }
    this.updateNotificationIndicator();
  },

  hideNotificationIndicator: function ns_hideNotificationIndicator() {
    if (this.unreadNotifications.length > 0) {
      this.unreadNotifications = [];
    }
    this.updateNotificationIndicator();
  },

  updateNotificationIndicator: function ns_updateNotificationIndicator() {
    if (this.unreadNotifications.length) {
      // If the ftu is running we should not show the ambient indicator
      // because the statusbar is not accessible
      if (Service.query('isFtuRunning')) {
        return;
      }
      this.ambientIndicator.classList.add('unread');
      navigator.mozL10n.setAttributes(
        this.ambientIndicator,
        'statusbarNotifications-unread',
        {n: this.unreadNotifications.length}
      );
    } else {
      this.ambientIndicator.classList.remove('unread');
      this.ambientIndicator.removeAttribute('aria-label');
    }

    Service.request('UtilityTray:updateNotificationCount');
  },

  closeToast: function ns_closeToast() {
    this.toaster.classList.remove('displayed');
    this.updateNotificationIndicator();
  },

  closeNotification: function ns_closeNotification(notificationNode) {
    var notificationId = notificationNode.dataset.notificationId;
    this.removeNotification(notificationId);
  },

  removeLockScreenNotification:
  function ns_removeLockScreenNotification(notificationId) {
    var lockScreenNotificationNode;
    var notifSelector = '[data-notification-id="' + notificationId + '"]';
    this.lockScreenContainer = this.getLockScreenContainer();
    if (this.lockScreenContainer) {
      lockScreenNotificationNode =
        this.lockScreenContainer.querySelector(notifSelector);
    }

    if (lockScreenNotificationNode) {
      var lockScreenNotificationParentNode =
        lockScreenNotificationNode.parentNode;
      lockScreenNotificationParentNode.removeChild(lockScreenNotificationNode);
      window.dispatchEvent(
        new window.CustomEvent('lockscreen-notification-request-remove', {
          containerEmpty: !lockScreenNotificationParentNode.firstElementChild
        }));
    }
  },

  removeNotification: function ns_removeNotification(notificationId) {
    var notifSelector = '[data-notification-id="' + notificationId + '"]';
    var notificationNode = this.container.querySelector(notifSelector);
    if (notificationNode) {
      notificationNode.remove();
    }
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('mozContentNotificationEvent', true, true, {
      type: 'desktop-notification-close',
      id: notificationId
    });
    window.dispatchEvent(event);
    // UX require to give a tiny delay for actionable notification on
    // LockScreen.
    setTimeout((function() {
      this.removeLockScreenNotification(notificationId);
    }).bind(this), 400);

    this.removeUnreadNotification(notificationId);
    if (!this.container.querySelector('.notification')) {
      // no notifications left
      this.clearAllButton.disabled = true;
    }
  },

  clearAll: function ns_clearAll() {
    var notifications = this.container.querySelectorAll('.notification');
    var clearable = [].slice.apply(notifications)
                      .filter(function isClearable(notification) {
                        return notification.dataset.noClear !== 'true';
                      });
    var notification;
    this.clearAllButton.disabled = true;
    // When focus is on a disabled element, Gecko will not dispatch any keyboard
    // events to it (the disabled element) and its parent.
    // The clearAll Button is focused but disabled right away after
    // user click it. We need to blur the focus immediately, otherwise System
    // app could not receive any keyboard events. See more detail on
    // http://bugzil.la/1106844
    this.clearAllButton.blur();
    if (!clearable.length) {
      return;
    }
    // Adding a callback to the last cleared notification to defer
    // the destroying of the notifications after the last disappear
    var lastClearable = clearable[clearable.length - 1];
    var removeAll = (function removeAll() {
      lastClearable.removeEventListener('transitionend', removeAll);
      for (var notification of clearable) {
        this.closeNotification(notification);
      }
    }).bind(this);
    lastClearable.addEventListener('transitionend', removeAll);

    for (var index = 0, max = clearable.length; index < max; index++) {
      notification = clearable[index];
      notification.style.transitionDelay = (this.CLEAR_DELAY * index) + 'ms';
      notification.classList.add('disappearing-via-clear-all');
      notification.style.transform = '';
    }
  },

  clearLockScreen: function ns_clearLockScreen() {
    // The LockScreenWindow may not be instantiated yet.
    if (!this.lockScreenContainer) {
      return;
    }
    while (this.lockScreenContainer.firstElementChild) {
      var element = this.lockScreenContainer.firstElementChild;
      this.lockScreenContainer.removeChild(element);
    }
    window.dispatchEvent(
      new window.CustomEvent('lockscreen-notification-request-clear'));
  }


};

window.addEventListener('load', function() {
  window.removeEventListener('load', this);
  if ('mozSettings' in navigator && navigator.mozSettings) {
    var key = 'notifications.resend';
    var req = navigator.mozSettings.createLock().get(key);
    req.onsuccess = function onsuccess() {
      var resendEnabled = req.result[key] || false;
      if (!resendEnabled) {
        return;
      }

      var resendCallback = (function(number) {
        window.dispatchEvent(
          new CustomEvent('desktop-notification-resend',
            { detail: { number: number } }));
      }).bind(this);

      if ('mozChromeNotifications' in navigator) {
        navigator.mozChromeNotifications.
          mozResendAllNotifications(resendCallback);
      }
    };
  }
});

SettingsListener.observe(
    'lockscreen.notifications-preview.enabled', true, function(value) {

  NotificationScreen.lockscreenPreview = value;
});

SettingsListener.observe('audio.volume.notification', 7, function(value) {
  NotificationScreen.silent = (value === 0);
});

SettingsListener.observe('vibration.enabled', true, function(value) {
  NotificationScreen.vibrates = value;
});
