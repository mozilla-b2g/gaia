/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';


var NotificationScreen = {
  TOASTER_TIMEOUT: 5000,
  TRANSITION_FRACTION: 0.30,
  TAP_THRESHOLD: 10,
  SCROLL_THRESHOLD: 10,

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

  init: function ns_init() {
    window.addEventListener('mozChromeNotificationEvent', this);
    this.notificationsContainer =
      document.getElementById('notifications-container');
    this.container =
      document.getElementById('desktop-notifications-container');
    this.lockScreenContainer =
      document.getElementById('notifications-lockscreen-container');
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
    window.addEventListener('appforeground',
      this.clearDesktopNotifications.bind(this));
    window.addEventListener('appopened',
      this.clearDesktopNotifications.bind(this));
    window.addEventListener('desktop-notification-resend', this);

    this._sound = 'style/notifications/ringtones/notifier_firefox.opus';

    this.ringtoneURL = new SettingsURL();

    // set up the media playback widget, but only if |MediaPlaybackWidget| is
    // defined (we don't define it in tests)
    if (typeof MediaPlaybackWidget !== 'undefined') {
      this.mediaPlaybackWidget = new MediaPlaybackWidget(
        document.getElementById('media-playback-container'),
        {nowPlayingAction: 'openapp'}
      );
    }

    var self = this;
    SettingsCache.observe('notification.ringtone', '', function(value) {
      self._sound = self.ringtoneURL.set(value);
    });

    // We have new default ringtones in 2.0, so check if the version is upgraded
    // then execute the necessary migration.
    VersionHelper.getVersionInfo().then(function(versionInfo) {
      if (versionInfo.isUpgrade()) {
        LazyLoader.load('js/tone_upgrader.js', function() {
          toneUpgrader.perform('alerttone');
        });
      }
    }, function(err) {
      console.error('VersionHelper failed to lookup version settings.');
    });
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

  // TODO: Remove this when we ditch mozNotification (bug 952453)
  clearDesktopNotifications: function ns_handleAppopen(evt) {
    var manifestURL = evt.detail.manifestURL,
        selector = '[data-manifest-u-r-l="' + manifestURL + '"]';

    var nodes = this.container.querySelectorAll(selector);

    for (var i = nodes.length - 1; i >= 0; i--) {
      if (nodes[i].dataset.obsoleteAPI === 'true') {
        this.closeNotification(nodes[i]);
      }
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
    if (!target.dataset.notificationId)
      return;

    this._notification = target;
    this._containerWidth = this.container.clientWidth;
    this._touchStartX = evt.touches[0].pageX;
    this._touchStartY = evt.touches[0].pageY;
    this._touchPosX = 0;
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
      if (touchDiffY < 0)
        this.closeToast();
      return;
    }

    if (evt.touches.length !== 1 ||
        (this._isTap && Math.abs(touchDiffY) >= this.SCROLL_THRESHOLD)) {
      this._touching = false;
      this.cancelSwipe();
      return;
    }

    evt.preventDefault();

    this._touchPosX = evt.touches[0].pageX - this._touchStartX;
    if (Math.abs(this._touchPosX) >= this.TAP_THRESHOLD) {
      this._isTap = false;
    }
    if (!this._isTap) {
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

    if (this._isTap) {
      var event = new CustomEvent('tap', {
        bubbles: true,
        cancelable: true
      });
      this._notification.dispatchEvent(event);
      this._notification = null;
      return;
    }

    if (Math.abs(this._touchPosX) >
        this._containerWidth * this.TRANSITION_FRACTION) {
      if (this._touchPosX < 0) {
        this._notification.classList.add('left');
      }
      this.swipeCloseNotification();
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
      UtilityTray.hide();
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
    this.toasterTitle.textContent = detail.title;
    this.toasterTitle.lang = detail.lang;
    this.toasterTitle.dir = dir;

    this.toasterDetail.textContent = detail.text;
    this.toasterDetail.lang = detail.lang;
    this.toasterDetail.dir = dir;
  },

  addNotification: function ns_addNotification(detail) {
    // LockScreen window may not opened while this singleton got initialized.
    this.lockScreenContainer = this.lockScreenContainer ||
      document.getElementById('notifications-lockscreen-container');

    var manifestURL = detail.manifestURL || '';
    var isPriorityNotification =
      this.PRIORITY_APPLICATIONS.indexOf(manifestURL) !== -1;

    var notificationContainer =
      (isPriorityNotification) ?
      this.container.querySelector('.priority-notifications') :
      this.container.querySelector('.other-notifications');

    // We need to animate the ambient indicator when the toast
    // timesout, so we skip updating it here, by passing a skip bool
    this.addUnreadNotification(detail.id, true);

    var notificationNode = document.createElement('div');
    notificationNode.classList.add('notification');
    notificationNode.setAttribute('role', 'link');

    notificationNode.dataset.notificationId = detail.id;
    notificationNode.dataset.obsoleteAPI = 'false';
    if (typeof detail.id === 'string' &&
        detail.id.indexOf('app-notif-') === 0) {
      notificationNode.dataset.obsoleteAPI = 'true';
    }
    var type = detail.type || 'desktop-notification';
    notificationNode.dataset.type = type;
    notificationNode.dataset.manifestURL = manifestURL;

    if (detail.icon) {
      var icon = document.createElement('img');
      icon.src = detail.icon;
      icon.setAttribute('role', 'presentation');
      notificationNode.appendChild(icon);
    }

    var dir = (detail.bidi === 'ltr' ||
               detail.bidi === 'rtl') ?
          detail.bidi : 'auto';

    var titleContainer = document.createElement('div');
    titleContainer.classList.add('title-container');
    titleContainer.lang = detail.lang;
    titleContainer.dir = dir;

    var title = document.createElement('div');
    title.classList.add('title');
    title.textContent = detail.title;
    title.lang = detail.lang;
    title.dir = dir;
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
    message.textContent = detail.text;
    message.lang = detail.lang;
    message.dir = dir;
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
      oldNotif.dataset.type = type;
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
    if (typeof(ScreenManager) !== 'undefined' &&
      !ScreenManager.screenEnabled) {
      // bug 915236: disable turning on the screen for email notifications
      // bug 1050023: disable turning on the screen for download notifications
      if (type.indexOf('download-notification-downloading') === -1 &&
          manifestURL.indexOf('email.gaiamobile.org') === -1) {
        ScreenManager.turnScreenOn();
      }
    }

    var notify = !('noNotify' in detail) &&
      // don't notify for network-alerts notifications
      (this.SILENT_APPLICATIONS.indexOf(manifestURL) === -1);

    // Notification toaster
    if (notify) {
      this.updateToaster(detail, type, dir);
      if (this.lockscreenPreview || !window.System.locked) {
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
    if (System.locked && this.lockscreenPreview) {
      var lockScreenNode = notificationNode.cloneNode(true);

      // First we try and find an existing notification with the same id.
      // If we have one, we'll replace it. If not, we'll create a new node.
      var oldLockScreenNode =
        this.lockScreenContainer.querySelector(notifSelector);
      if (oldLockScreenNode) {
        this.lockScreenContainer.replaceChild(
          lockScreenNode,
          oldLockScreenNode
        );
      }
      else {
        this.lockScreenContainer.insertBefore(
          lockScreenNode,
          this.lockScreenContainer.firstElementChild
        );
      }

      // To prevent add more code in this too complicated component,
      // LockScreen related code would incrementally move to another component.
      // However, to keep the compatibility is necessary, so the APIs would
      // accomplish the existing code.
      window.lockScreenNotificationBuilder.decorate(lockScreenNode);
      window.lockScreenNotifications.showColoredMaskBG();

      // UX specifies that the container should scroll to top
      /* note two things:
       * 1. we need to call adjustContainerVisualHints even
       *    though we're setting scrollTop, since setting sT doesn't
       *    necessarily invoke onscroll (if the old container is already
       *    scrolled to top, we might still need to decide to show
       *    the arrow)
       * 2. set scrollTop before calling adjustContainerVisualHints
       *    since sT = 0 will hide the mask if it's showing,
       *    and if we call aCVH before setting sT,
       *    under some circumstances aCVH would decide to show mask,
       *    only to be negated by st = 0 (waste of energy!).
       */
      window.lockScreenNotifications.scrollToTop();

      // check if lockscreen notifications visual
      // hints (masks & arrow) need to show
      window.lockScreenNotifications.adjustContainerVisualHints();
    }

    if (notify && !this.isResending) {
      if (!this.silent) {
        var ringtonePlayer = new Audio();
        var telephony = window.navigator.mozTelephony;
        var isOnCall = telephony && telephony.calls.some(function(call) {
          return (call.state == 'connected');
        });
        var isOnMultiCall = telephony && telephony.conferenceGroup &&
          telephony.conferenceGroup.state === 'connected';

        ringtonePlayer.src = this._sound;

        if (isOnCall || isOnMultiCall) {
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
        }, 2000);
      }

      if (this.vibrates) {
        if (document.hidden) {
          // bug 1030310: disable vibration for the email app when asleep
          // bug 1050023: disable vibration for downloads when asleep
          if (type.indexOf('download-notification-downloading') === -1 &&
              manifestURL.indexOf('email.gaiamobile.org') === -1) {
            window.addEventListener('visibilitychange', function waitOn() {
              window.removeEventListener('visibilitychange', waitOn);
              navigator.vibrate([200, 200, 200, 200]);
            });
          }
        } else {
          navigator.vibrate([200, 200, 200, 200]);
        }
      }
    }

    // must be at least one notification now
    this.clearAllButton.disabled = false;

    return notificationNode;
  },

  swipeCloseNotification: function ns_swipeCloseNotification() {
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
    notification.style.transform = '';
  },

  addUnreadNotification: function ns_addUnreadNotification(id, skipUpdate) {
    if (UtilityTray.shown) {
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
      this.ambientIndicator.className = 'unread';
      this.ambientIndicator.setAttribute('aria-label', navigator.mozL10n.get(
        'statusbarNotifications-unread', {n: this.unreadNotifications.length}));
    } else {
      this.ambientIndicator.classList.remove('unread');
      this.ambientIndicator.removeAttribute('aria-label');
    }
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
    var notifSelector = '[data-notification-id="' + notificationId + '"]';
    this.lockScreenContainer = this.lockScreenContainer ||
      document.getElementById('notifications-lockscreen-container');
    if (this.lockScreenContainer) {
      var lockScreenNotificationNode =
          this.lockScreenContainer.querySelector(notifSelector);
    }

    if (lockScreenNotificationNode) {
      var lockScreenNotificationParentNode =
        lockScreenNotificationNode.parentNode;
      lockScreenNotificationParentNode.removeChild(lockScreenNotificationNode);
      // if we don't have any notifications,
      // use the no-notifications masked background for lockscreen
      if (!lockScreenNotificationParentNode.firstElementChild) {
        window.lockScreenNotifications.hideColoredMaskBG();
      }

      // check if lockscreen notifications visual
      // hints (masks & arrow) need to show
      window.lockScreenNotifications.adjustContainerVisualHints();
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
    for (var notification of notifications) {
      this.closeNotification(notification);
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

    // remove the "have notifications" masked background from lockscreen
    window.lockScreenNotifications.hideColoredMaskBG();
    // check if lockscreen notifications visual
    // hints (masks & arrow) need to show
    window.lockScreenNotifications.adjustContainerVisualHints();
  }

};

window.addEventListener('load', function() {
  window.removeEventListener('load', this);
  if (window.SettingsCache) {
    SettingsCache.get('notifications.resend', function onsuccess(value) {
      var resendEnabled = value || false;
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
    });
  }
});

NotificationScreen.init();

SettingsCache.observe(
    'lockscreen.notifications-preview.enabled', true, function(value) {

  NotificationScreen.lockscreenPreview = value;
});

SettingsCache.observe('audio.volume.notification', 7, function(value) {
  NotificationScreen.silent = (value == 0);
});

SettingsCache.observe('vibration.enabled', true, function(value) {
  NotificationScreen.vibrates = value;
});
