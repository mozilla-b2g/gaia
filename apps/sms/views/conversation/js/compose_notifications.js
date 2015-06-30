/* global AppNotification,
          Settings
*/

/*exported ComposeNotifications */

(function(exports) {
'use strict';

const priv = Object.freeze({
  compose: Symbol('compose'),
  notifications: Symbol('notifications'),
  previousMessageSegment: Symbol('previousMessageSegment'),
  isEnabled: Symbol('isEnabled'),

  onInput: Symbol('onInput'),
  onSubjectChange: Symbol('onSubjectChange'),
  onSegmentInfoChange: Symbol('onSegmentInfoChange'),
  onTypeChanged: Symbol('onTypeChanged')
});

var ComposeNotifications = {
  [priv.compose]: null,
  [priv.notifications]: new Map(),
  [priv.previousMessageSegment]: 0,
  [priv.isEnabled]: true,

  init(compose) {
    this[priv.compose] = compose;

    compose.on('input', this[priv.onInput].bind(this));
    compose.on('subject-change', this[priv.onSubjectChange].bind(this));
    compose.on('segmentinfochange', this[priv.onSegmentInfoChange].bind(this));
    compose.on('type', this[priv.onTypeChanged].bind(this));
  },

  [priv.onInput]() {
    let compose = this[priv.compose];

    let doesNotNotifyAboutSizeChange = !compose.isResizing &&
      (compose.type === 'sms' || !Settings.mmsSizeLimitation ||
       compose.size < Settings.mmsSizeLimitation);

    if (doesNotNotifyAboutSizeChange) {
      this.hideNotificationAfterTimeout('message-resizing');
      this.hideNotification('message-max-size');
    } else if (compose.isResizing) {
      this.showNotification(
        'message-resizing', 'resize-image', { persistent: true }
      );
    } else if (compose.size > Settings.mmsSizeLimitation) {
      this.replaceNotification(
        'message-max-size',
        {
          id: 'multimedia-message-exceeded-max-length',
          args: { mmsSize: (Settings.mmsSizeLimitation / 1024).toFixed(0) }
        },
        { persistent: true }
      );
    } else {
      this.replaceNotification(
        'message-max-size', 'messages-max-length-text', { persistent: true }
      );
    }
  },

  [priv.onSubjectChange]() {
    let compose = this[priv.compose];
    if (compose.isSubjectVisible && compose.isSubjectMaxLength()) {
      this.showNotification(
        'subject-max-length',
        'messages-max-subject-length-text',
        { timeout: 2000 }
      );
    } else {
      this.hideNotification('subject-max-length');
    }
  },

  [priv.onSegmentInfoChange]() {
    let compose = this[priv.compose];

    let currentMessageSegment = compose.segmentInfo.segments;
    let previousMessageSegment = this[priv.previousMessageSegment];

    let isValidSegment = currentMessageSegment > 0;
    let isSegmentChanged = previousMessageSegment !== currentMessageSegment;
    let isStartingFirstSegment = previousMessageSegment === 0 &&
      currentMessageSegment === 1;

    if (compose.type === 'sms' && isValidSegment && isSegmentChanged &&
        !isStartingFirstSegment) {
      this[priv.previousMessageSegment] = currentMessageSegment;

      this.replaceNotification('message-segment', {
        id: 'sms-counter-notice-label',
        args: { number: currentMessageSegment }
      });
    }
  },

  [priv.onTypeChanged]() {
    this.replaceNotification(
      'message-type', `converted-to-${this[priv.compose].type}`
    );
  },

  /*
   * This function will be called before we slide to the thread or composer
   * panel. This way it can change things in the panel before the panel is
   * visible.
   */
  beforeEnter: function conv_beforeEnter(args) {
    this.clearConvertNoticeBanners();
  },

  beforeEnterThread: function conv_beforeEnterThread(args) {
    // If transitioning from the 'new message' view, we don't want to notify
    // about type conversion right now, but only after the type of the thread
    // is set (see afterEnterThread)
    if (!prevPanel || prevPanel.panel !== 'composer') {
      this.enableConvertNoticeBanners();
    }
  },

  beforeEnterComposer() {
    this.enableConvertNoticeBanners();
  },

  afterEnterThread: function conv_afterEnterThread(args) {
    // When coming from the "new message" view, enable notifications only after
    // the user enters the view.
    if (prevPanel && prevPanel.panel === 'composer') {
      this.enableConvertNoticeBanners();
    }
  },

  beforeLeave: function conv_beforeLeave(args) {
    this.disableConvertNoticeBanners();
  },

  sendMessage: function conv_sendMessage(opts) {

    // Clean composer fields (this lock any repeated click in 'send' button)
    this.disableConvertNoticeBanners();
    this.cleanFields();
    this.enableConvertNoticeBanners();
  },

  showNotification(tag, content, options) {
    if(!this[priv.isEnabled]) {
      return;
    }

    let notification = this.notifications.get(tag);

    if (!notification) {
      notification = AppNotification.create(content, options);
      this.notifications.set(tag, notification);
    }

    notification.show();
  },

  replaceNotification(tag, ...showParameters) {
    this.hideNotification(tag);
    this.showNotification(tag, ...showParameters);
  },

  hideNotification(tag) {
    let notification = this.notifications.get(tag);
    if (notification) {
      notification.hide();
    }
  },

  hideNotificationAfterTimeout(tag, timeout) {
    let notification = this.notifications.get(tag);
    if (notification) {
      notification.hideAfterTimeout(timeout);
    }
  },

  clear() {
    this[priv.notifications].forEach((notification) => notification.hide());
    this[priv.notifications].clear();
  },

  disable() {
    this.toggle(false /* isEnabled */);
  },

  enable() {
    this.toggle(true /* isEnabled */);
  },

  toggle(isEnabled) {
    this[priv.isEnabled] = isEnabled;
  }
};

exports.ComposeNotifications = ComposeNotifications;
}(this));
