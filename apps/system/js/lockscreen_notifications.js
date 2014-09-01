/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
'use strict';

(function(exports) {
  /**
   * Manage Notifications in Lockscreen:
   * Handle notification changes from Notifications, and
   * update Lockscreen visuals accordingly.
   *
   * @constructor LockScreenNotifications
   */
  var LockScreenNotifications = function() {};

  LockScreenNotifications.prototype.start =
  function lsn_start(lockScreen, container){
    this._lockScreen = lockScreen;
    this.container = container;
    this.arrow =
      document.getElementById('lockscreen-notification-arrow');
    // The 'scroll' event can't be forwarded via 'window'.
    this.container.addEventListener('scroll', this);
    this.configs = {
      listens: [
        'lockscreen-notification-request-highlight',
        'lockscreen-notification-highlighted',
        'lockscreen-notification-clean-highlighted',
        'lockscreen-notification-clicked',
        'touchstart'
      ],
      // UX require to cancel the highlighted state after
      // idle 3 seconds.
      timeoutHighlighted: 3000
    };
    this.configs.listens.forEach((ename) => {
      window.addEventListener(ename, this);
    });

    this.states = {
      // UX require to clean idle and highlighted notification
      // after sevaral seconds.
      highlightedNotifications: {},
      currentHighlighted: null,
      currentHighlightedId: null,
      arrowVisible: false // container is scrollable
    };
  };

  LockScreenNotifications.prototype.handleEvent =
  function lsn_handleEvent(evt) {
    var detail = evt.detail || {};
    var { id, timestamp } = detail;
    switch (evt.type) {
      case 'lockscreen-notification-request-highlight':
        if (!this.notificationOutOfViewport(evt.detail.node)) {
          evt.detail.highlighter();
        }
      break;
      case 'lockscreen-notification-highlighted':
        this.onNotificationHighlighted(id, timestamp);
      break;
      case 'lockscreen-notification-clean-highlighted':
        this.onCleanHighlighted(id, timestamp);
      break;
      case 'lockscreen-notification-clicked':
        this.onNotificationClicked(evt.detail);
      break;
      case 'touchstart':
        if (!evt.target.classList.contains('notification') &&
            !evt.target.classList.contains('button-actionable')) {
          this.onNotificationsBlur();
        }
      break;
      case 'scroll':
        this.onContainerScrolling();
      break;
    }
  };

  LockScreenNotifications.prototype.onContainerScrolling =
  function lsn_onContainerScrolling() {
    if (this.notificationOutOfViewport(this.states.currentHighlighted)) {
      this.onNotificationsBlur();
    }
  };

  LockScreenNotifications.prototype.notificationOutOfViewport =
  function lsn_notificationOutOfViewport(node) {
    var top, bottom;
    var topBoundary, bottomBoundary;
    if (node) {
      topBoundary = this.container.getBoundingClientRect().top;
      bottomBoundary = this.container.getBoundingClientRect().bottom;
      top = node.getBoundingClientRect().top;
      bottom = node.getBoundingClientRect().bottom;
      if (top < topBoundary ||
          bottom > bottomBoundary) {
        return true;
      } else {
        return false;
      }
    }
    return false;
  };

  /**
   * Get the notification at the buttom boundary.
   */
  LockScreenNotifications.prototype.notificationAtBottomBoundary =
  function lsn_notificationAtBottomBoundary() {
    var boundaryElement = this.arrow;
    var detectingPoint = {
      x: window.innerWidth >> 1,
      y: boundaryElement.getBoundingClientRect().top +
        this.configs.boundaryThresholdBottom
    };
    var element = document.elementFromPoint(detectingPoint.x, detectingPoint.y);
    if (element.classList.contains('notification')) {
      return element;
    }
    return null;
  };

  /**
   * Get the notification at the top boundary.
   */
  LockScreenNotifications.prototype.notificationAtTopBoundary =
  function lsn_notificationAtBottomBoundary() {
    var boundaryElement = this.container;
    var detectingPoint = {
      x: window.innerWidth >> 1,
      y: boundaryElement.getBoundingClientRect().top +
        this.configs.boundaryThresholdTop
    };
    var element = document.elementFromPoint(detectingPoint.x, detectingPoint.y);
    if (element.classList.contains('notification')) {
      return element;
    }
    return null;
  };

  LockScreenNotifications.prototype.onNotificationsBlur =
  function lsn_onNotificationsBlur() {
    var id = this.states.currentHighlightedId;
    var notificationNode = this.states.currentHighlighted;
    if (notificationNode &&
        notificationNode.classList.contains('actionable')) {
      this.removeNotificationHighlight(notificationNode);
      delete this.states.highlightedNotifications[id];
      this.states.currentHighlighted = null;
      this.states.currentHighlightedId = null;

      this._tryAddTopMaskByNotification(notificationNode);
    }
  };

  /**
   * Record the timestamp when a notification is highlighted.
   */
  LockScreenNotifications.prototype.onNotificationHighlighted =
  function lsn_onNotificationHighlighted(id, timestamp) {
    // Overwrite existing because re-clicking on it is legal.
    this.states.highlightedNotifications[id] = timestamp;
    this.states.currentHighlightedId = id;
    this.states.currentHighlighted = this.container.querySelector(
      '[data-notification-id="' + id + '"]');

    // because background of an active actionable notification can be clipped
    // by the top mask implemented in lockscreen visual refresh 2.0 (bug1023500)
    // we need to cancel the mask when the 'top' (in the visible viewport, not
    // the whole container) notification is active, by 'top-actionable' class.
    // (note: the 'top mask' displays only when the container scrolls to bottom)

    // such 'top'-ness is decided by the viewport size of the container:
    // if the container can show N visible notifications,
    // then the last-Nth notification is that 'top' notification.

    // Illustration:
    //
    // --top------------------ container -------------bottom--
    //                               ======= viewport ========
    // ------------------------------=========================
    // |  0  |  1  |  2  |  3  |  4  |  5  |  6  |  7  |  8  |
    // |     |     |     |     |     |  0  |  1  |  2  |  3  |
    // ------------------------------=========================
    // In this illustration, the ID of the visually top notification in the
    // viewport is #5; the number of notifications in container viewport is 4.
    // We can select the #5 notification by :nth-last-of-type(4).

    var numNotificationInContainerViewport =
        this._getNumNotificationInContainerViewport();

    if (this.container.querySelector('div.notification:nth-last-of-type(' +
          numNotificationInContainerViewport + ')') ===
          this.states.currentHighlighted){
      this.container.classList.add('top-actionable');
    }else{
      this.container.classList.remove('top-actionable');
    }
  };

  /**
   * Clean the highlighted notification.
   */
  LockScreenNotifications.prototype.onCleanHighlighted =
  function lsn_onNotificationHighlighted(id, timestamp) {
    var prevTimestamp = this.states.highlightedNotifications[id];
    if (prevTimestamp &&
        timestamp - prevTimestamp > this.configs.timeoutHighlighted) {
      var notificationNode = this.container.querySelector(
        '[data-notification-id="' + id + '"]');
      if (notificationNode &&
          notificationNode.classList.contains('actionable')) {
        this.removeNotificationHighlight(notificationNode);
        delete this.states.highlightedNotifications[id];
        this.states.currentHighlighted = null;
        this.states.currentHighlightedId = null;

        this._tryAddTopMaskByNotification(notificationNode);
      }
    }
  };

  LockScreenNotifications.prototype.removeNotificationHighlight =
  function lsn_removeNotificationHighlight(node) {
    node.classList.remove('actionable');
    node.querySelector('.button-actionable').remove();
    var oldPrevious = this.container.querySelector(
      '.notification.previous-actionable');
    if (null !== oldPrevious) {
      oldPrevious.classList.remove('previous-actionable');
    }
  };

  /**
   * When user clicked on the notification while it's locked.
   */
  LockScreenNotifications.prototype.onNotificationClicked =
  function lsn_onNotificationClicked(info) {
    this._lockScreen._unlockingMessage = {
      notificationId: info.notificationId
    };
    this._lockScreen._activateUnlock();
  };

  /**
   * Bind lockscreen onto this module
   *
   * @this {LockScreenNotifications}
   * @memberof LockScreenNotifications
   * @param bindLockScreen the lockScreen instance
   */
  LockScreenNotifications.prototype.bindLockScreen =
  function lsn_bindLockScreen(lockScreen) {
    this._lockScreen = lockScreen;
  };

  /**
   * When we have notifications, show bgcolor from wallpaper
   * Remove the simple gradient at the same time
   * 
   * @memberof LockScreenNotifications
   * @this {LockScreenNotifications}
   */
  LockScreenNotifications.prototype.showColoredMaskBG =
  function lsn_showColoredMaskBG() {
    this._lockScreen.maskedBackground.style.backgroundColor =
      this._lockScreen.maskedBackground.dataset.wallpaperColor;

    this._lockScreen.maskedBackground.classList.remove('blank');
  };

  /**
   * When we don't have notifications, use the
   * simple gradient as lockscreen's masked background
   * 
   * @memberof LockScreenNotifications
   * @this {LockScreenNotifications}
   */
  LockScreenNotifications.prototype.hideColoredMaskBG =
  function lsn_hideColoredMaskBG() {
    this._lockScreen.maskedBackground.style.backgroundColor = 'transparent';
    this._lockScreen.maskedBackground.classList.add('blank');
  };

  /**
   * We use a smaller notifications container when we have a media player
   * widget on the lockscreen. This function collapses the container.
   * 
   * @memberof LockScreenNotifications
   * @this {LockScreenNotifications}
   */
  LockScreenNotifications.prototype.collapseNotifications =
  function lsn_collapseNotifications() {
    this._lockScreen.notificationsContainer.classList.add('collapsed');
    this._lockScreen.notificationArrow.classList.add('collapsed');
  };

  /**
   * ...and this function expands the container.
   * 
   * @memberof LockScreenNotifications
   * @this {LockScreenNotifications}
   */
  LockScreenNotifications.prototype.expandNotifications =
  function lsn_expandNotifications() {
    this._lockScreen.notificationsContainer.classList.remove('collapsed');
    this._lockScreen.notificationArrow.classList.remove('collapsed');
  };

  /**
   * adjust the container's visual hints: masks and "more notification" arrow
   * @memberof LockScreenNotifications
   * @this {LockScreenNotifications}
   */
  LockScreenNotifications.prototype.adjustContainerVisualHints =
  function lsn_adjustContainerVisualHints() {
    var notificationsContainer = this._lockScreen.notificationsContainer;

    /* mask:
     * the gradient masks only show when:
     * - "top" mask: when the user scrolls to bottom (this is a solid mask)
     * - "both" mask: when the user scrolls in between (this is a gradient mask)
     * (but we need to rule out the situation that
     * the container isn't actually scrollable)
     */
    if(notificationsContainer.clientHeight ===
       notificationsContainer.scrollHeight){
      // no mask if the container can't be scrolled
      this._setMaskVisibility(false, false);
    }else{
      if(notificationsContainer.scrollTop +
      notificationsContainer.clientHeight ===
      notificationsContainer.scrollHeight){
        // user scrolls to bottom -> top mask
        this._setMaskVisibility(true, false);
      }else if(0 === notificationsContainer.scrollTop){
        // user scrolls to top -> no mask
        this._setMaskVisibility(false, false);
      }else{
        // anything in between -> "both" mask
        this._setMaskVisibility(false, true);
      }
    }

    /*
     * arrow: 
     * The "more notifications" arrow only shows
     * when the user is on the top of the container
     * and the container is scrollable
     */
    this._setArrowVisibility(
      0 === notificationsContainer.scrollTop &&
      notificationsContainer.clientHeight <
      notificationsContainer.scrollHeight
    );
  };

  /**
   * Sets the masks' visibility.
   *
   * @private
   * @memberof LockScreenNotifications
   * @this {LockScreenNotifications}
   * @param top Boolen shows top solid mask or not
   * @param both Boolen shows top-and-bottom gradient masks or not
   */
  LockScreenNotifications.prototype._setMaskVisibility =
  function lsn__setMaskVisibility(top, both) {
    var notificationsContainer = this._lockScreen.notificationsContainer;

    if(top){
      notificationsContainer.classList.add('masked-top');
    }else{
      notificationsContainer.classList.remove('masked-top');
    }

    if(both){
      notificationsContainer.classList.add('masked-both');
    }else{
      notificationsContainer.classList.remove('masked-both');
    }
  };

  /**
   * Sets the arrow's visibility.
   *
   * @private
   * @memberof LockScreenNotifications
   * @this {LockScreenNotifications}
   * @param top Boolen shows top solid mask or not
   * @param both Boolen shows top-and-bottom gradient masks or not
   */
  LockScreenNotifications.prototype._setArrowVisibility =
  function lsn__setArrowVisibility(visible) {
    var notificationArrow = this._lockScreen.notificationArrow;

    if(visible){
      notificationArrow.classList.add('visible');
      this.states.arrowVisible = true;
    }else{
      notificationArrow.classList.remove('visible');
      this.states.arrowVisible = false;
    }
  };

  /**
   * Scrolls the notifications to the top
   */
  LockScreenNotifications.prototype.scrollToTop =
  function lsn_scrollToTop() {
    this._lockScreen.notificationsContainer.scrollTop = 0;
  };

  LockScreenNotifications.prototype._getWindowInnerDimension =
  function lsn_getWindowInnerDimension() {
    return {
            height: window.innerHeight,
            width: window.innerWidth
           };
  };

  /**
   * Get the number of notifications visible in the container.
   * we have 2 viewable notifications for HVGA lockscreen with music player
   * widget, and for larger screen, and the absence of the widget,
   * we can allow one, or two, more viewable notifications.
   */
  LockScreenNotifications.prototype._getNumNotificationInContainerViewport =
  function lsn_getNumNotificationInContainerViewport() {
    var numNotificationInContainerViewport = 2;

    // monitor > HVGA => allow one more notification
    if (this._getWindowInnerDimension().height > 480) {
      numNotificationInContainerViewport++;
    }

    // no music player widget => also allow one more notification
    if (!this.container.classList.contains('collapsed')) {
      numNotificationInContainerViewport++;
    }

    return numNotificationInContainerViewport;
  };

  LockScreenNotifications.prototype._tryAddTopMaskByNotification =
  function lsn_tryAddTopMaskByNotification(notificationNode) {
    // if the unhighlighted node was the visually top notification of the
    // viewport, add the top mask back by removing the top-actionable class.
    // (see also: onNotificationHighlighted)
    var numNotificationInContainerViewport =
        this._getNumNotificationInContainerViewport();
    if (this.container.querySelector('div.notification:nth-last-of-type(' +
        numNotificationInContainerViewport + ')') === notificationNode){
      this.container.classList.remove('top-actionable');
    }
  };

  /** @exports LockScreenWindowManager */
  exports.LockScreenNotifications = LockScreenNotifications;
})(window);
