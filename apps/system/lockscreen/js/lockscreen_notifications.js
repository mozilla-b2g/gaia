'use strict';

/* global LockScreenNotificationBuilder, LazyLoader */

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
    LazyLoader.load(['lockscreen/js/lockscreen_notification_builder.js'])
      .then(() => {
        this._lockScreenNotificationBuilder =
          new LockScreenNotificationBuilder(this.container);
        this._lockScreenNotificationBuilder.start();
      });
    this.arrow =
      document.getElementById('lockscreen-notification-arrow');
    // The 'scroll' event can't be forwarded via 'window'.
    this.container.addEventListener('scroll', this);
    this.configs = {
      listens: [
        'lockscreen-notification-request-highlight',
        'lockscreen-notification-notify-highlighted',
        'lockscreen-notification-request-clean-highlighted',
        'lockscreen-notification-request-activate',
        'lockscreen-notification-request-append',
        'lockscreen-notification-request-remove',
        'lockscreen-notification-request-clear',
        'lockscreen-appopened',
        'lockscreen-appclosed',
        'touchstart',
        'visibilitychange',
        'scroll'
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
    var { id, timestamp, node } = detail;
    switch (evt.type) {
      case 'lockscreen-notification-request-append':
        this.onNotificationAppend(id, node);
      break;
      case 'lockscreen-notification-request-remove':
        var containerEmpty = false;
        if (evt.detail && evt.detail.containerEmpty) {
          containerEmpty = true;
        }
        this.onNotificationRemoved(containerEmpty);
      break;
      case 'lockscreen-notification-request-clear':
        this.onNotificationsClear();
      break;
      case 'lockscreen-notification-request-highlight':
        if (!this.notificationOutOfViewport(evt.detail.node)) {
          evt.detail.highlighter();
        }
      break;
      case 'lockscreen-notification-notify-highlighted':
        this.onNotificationHighlighted(id, timestamp);
      break;
      case 'lockscreen-notification-request-clean-highlighted':
        this.onCleanHighlighted(id, timestamp);
      break;
      case 'lockscreen-notification-request-activate':
        this.onNotificationActivate(evt.detail);
      break;
      case 'touchstart':
        if (!evt.target.classList.contains('notification') &&
            !evt.target.classList.contains('button-actionable')) {
          this.onNotificationsBlur();
        }
      break;
      case 'lockscreen-appopened':
        // When it's visible because of locking, bind the listener.
        window.addEventListener('touchstart', this);
      break;
      case 'lockscreen-appclosed':
        // When it's invisible because of unlocking, unbind the listener.
        window.removeEventListener('touchstart', this);
      break;
      case 'scroll':
        this.onContainerScrolling();
      break;
      case 'visibilitychange':
        if (!document.hidden) {
          // When it's visible, bind the listener.
          window.addEventListener('touchstart', this);
          this.updateTimestamps();
        } else {
          // When it's invisible, unbind the listener.
          window.removeEventListener('touchstart', this);
        }
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
      // If we're in HVGA resolution, the too small notification container
      // would lead second and following up notifications overlap the boundary
      // by several pixels.
      var HVGATolerance = 0;
      if (this._getWindowInnerDimension().height <= 480) {
        HVGATolerance = 1;
      }
      topBoundary = this.container.getBoundingClientRect().top;
      bottomBoundary = this.container.getBoundingClientRect().bottom;
      top = node.getBoundingClientRect().top;
      bottom = node.getBoundingClientRect().bottom;
      if (top < topBoundary ||
          bottom > bottomBoundary + HVGATolerance) {
        return true;
      } else {
        return false;
      }
    }
    return false;
  };

  /**
   * Get the notification at the bottom boundary.
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
  LockScreenNotifications.prototype.onNotificationActivate =
  function lsn_onNotificationActivate(info) {
    this._lockScreen._unlockingMessage = {
      notificationId: info.notificationId
    };
    window.dispatchEvent(
      new CustomEvent('lockscreen-notification-request-activate-unlock'));
  };

  /**
   * When new notification appended, do the visual change.
   * Would receive a ordinary Notificaition node.
   */
  LockScreenNotifications.prototype.onNotificationAppend =
  function lsn_onNotificationsAppend(id, node) {
      var notifSelector = '[data-notification-id="' + id + '"]';
      // First we try and find an existing notification with the same id.
      // If we have one, we'll replace it. If not, we'll create a new node.
      var oldLockScreenNode =
        this.container.querySelector(notifSelector);
      if (oldLockScreenNode) {
        this.container.replaceChild(
          node,
          oldLockScreenNode
        );
      }
      else {
        this.container.insertBefore(
          node,
          this.container.firstElementChild
        );
      }

      this._lockScreenNotificationBuilder.decorate(node);
      this.showColoredMaskBG();

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
      this.scrollToTop();

      // check if lockscreen notifications visual
      // hints (masks & arrow) need to show
      this.adjustContainerVisualHints();
  };

  LockScreenNotifications.prototype.onNotificationRemoved =
  function lsn_onNotificationRemoved(containerEmpty) {
    // if we don't have any notifications,
    // use the no-notifications masked background for lockscreen
    if (containerEmpty) {
      this.hideColoredMaskBG();
    }
    // check if lockscreen notifications visual
    // hints (masks & arrow) need to show
    this.adjustContainerVisualHints();
  };

  LockScreenNotifications.prototype.onNotificationsClear =
  function lsn_onNotificationsClear() {
    // remove the "have notifications" masked background from lockscreen
    this.hideColoredMaskBG();
    // check if lockscreen notifications visual
    // hints (masks & arrow) need to show
    this.adjustContainerVisualHints();
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

  LockScreenNotifications.prototype.updateTimestamps =
  function lsn_updateTimestamps() {
    var timestamps = [...document.querySelectorAll('.notification .timestamp')];
    timestamps.forEach((element) => {
      element.textContent =
        this.prettyDate(new Date(element.dataset.timestamp));
    });
  };

  /**
   * Display a human-readable relative timestamp.
   */
  LockScreenNotifications.prototype.prettyDate =
  function lsn_prettyDate(time) {
    var date;
    if (navigator.mozL10n) {
      date = navigator.mozL10n.DateTimeFormat().fromNow(time, true);
    } else {
      date = time.toLocaleFormat();
    }
    return date;
  };

  /** @exports LockScreenWindowManager */
  exports.LockScreenNotifications = LockScreenNotifications;
})(window);
