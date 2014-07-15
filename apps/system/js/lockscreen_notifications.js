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

  LockScreenNotifications.prototype = {
    /*
     * The LockScreen this module is operating on
     */
    _lockScreen: null
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
    }else{
      notificationArrow.classList.remove('visible');
    }
  };

  /**
   * Scrolls the notifications to the top
   */
  LockScreenNotifications.prototype.scrollToTop =
  function lsn_scrollToTop() {
    this._lockScreen.notificationsContainer.scrollTop = 0;
  };

  /** @exports LockScreenWindowManager */
  exports.LockScreenNotifications = LockScreenNotifications;
})(window);
