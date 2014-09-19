/**
  Copyright 2012, Mozilla Foundation

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
 */

/**
 * To build an LockScreen notification and prevent to add such building
 * code in the manager components.
 */

'use strict';
(function(exports) {

  var LockScreenNotificationBuilder = function() {};

  LockScreenNotificationBuilder.prototype.start =
  function(container) {
    this.container = container;
    this.selector = {
      highlighted: '.notification.actionable',
      notification: '.notification'
    };

    // UX require to cancel the highlighted state after
    // idle 3 seconds.
    this.timeoutHighlighted = 3000;
  };

  /**
   * To make new LockScreen notification from an existing one.
   * This is to keep the compatibility with the existing code.
   *
   * XXX: A better way should be create the notifiction of LockScreen
   * from this component only, but to refactor the old notifications
   * is the perquisite.
   *
   * @param node {DOMElement} - the notification node
   * @return {DOMElement}
   */
  LockScreenNotificationBuilder.prototype.decorate =
  function lsnb_decorate(node) {
    // If this is the previous node before the activated one,
    // it should hide the buttom border.
    var next = node.nextElementSibling;
    if (null !== next && next.classList.contains('actionable')) {
      node.classList.add('previous-actionable');
    }

    node.addEventListener('click',
      this.requestHighlight.bind(this, node));
    return node;
  };

  LockScreenNotificationBuilder.prototype.requestHighlight =
  function lsnb_requestHighlight(node) {
    window.dispatchEvent(new CustomEvent(
      'lockscreen-notification-request-highlight', {
        detail: {
          node: node,
          highlighter:  this.highlight.bind(this, node)
        }
      }));
  };

  // little helper that can be stubbed when testing;
  LockScreenNotificationBuilder.prototype._getWindowInnerHeight =
  function lsnb_getWindowInnerHeight() {
    return window.innerHeight;
  };

  /**
   * When it get clicked, do the UI change.
   */
  LockScreenNotificationBuilder.prototype.highlight =
  function lsnb_highlight(node) {
    // Cancel other's highlight first.
    var highlighted = this.container.querySelector(this.selector.highlighted);
    if (highlighted) {
      this.removeHighlight(highlighted);
    }
    var button = this.createActionButton(node.dataset.notificationId);
    node.appendChild(button);
    node.classList.add('actionable');

    // because background of an active actionable notification can be clipped
    // by the top mask implemented in lockscreen visual refresh 2.0,
    // we need to cancel the mask when the 'top' (in the visible viewport,
    // not the whole container) notification is active. such 'top'-ness is
    // is decided by the notification's relative reverse position.
    // we have 2 viewable notifications for HVGA lockscreen with music player
    // widget, and for larger screen, and the absence of the widget,
    // we can allow one, and two, more viewable notifications.
    var visualTopPosition = 2;

    if (this._getWindowInnerHeight() > 480) {
      visualTopPosition++;
    }
    if (!this.container.classList.contains('collapsed')) {
      visualTopPosition++;
    }

    if (this.container.querySelector(
          'div.notification:nth-last-of-type(' + visualTopPosition + ')'
        ) === node){
      this.container.classList.add('top-actionable');
    }

    window.dispatchEvent(new CustomEvent(
      'lockscreen-notification-highlighted', {
      detail: {
        id: node.dataset.notificationId,
        timestamp: Date.now()
      }
    }));
    setTimeout(() => {
      // UX require to clean idle and highlighted notification
      // after sevaral seconds.
      window.dispatchEvent(new CustomEvent(
        'lockscreen-notification-clean-highlighted', {
        detail: {
          id: node.dataset.notificationId,
          timestamp: Date.now()
        }
      }));
    }, this.timeoutHighlighted);

    // Find previous one and cancel it's bottom border.
    var previous = node.previousElementSibling;
    var oldPrevious = document.querySelector(
        '#notifications-lockscreen-container '+
        '.notification.previous-actionable');
    if (null !== oldPrevious) {
      oldPrevious.classList.remove('previous-actionable');
    }
    if (null !== previous) {
      previous.classList.add('previous-actionable');
    }
  };

  LockScreenNotificationBuilder.prototype.removeHighlight =
  function lsnb_removeHighlight(node) {
    this.container.classList.remove('top-actionable');
    node.classList.remove('actionable');
    node.querySelector('.button-actionable').remove();
  };

  /**
   * Create the button and make the notification actionalbe.
   *
   * @param notificationId {string} - the ID need to fire the event
   * @return {DOMElement}
   */
  LockScreenNotificationBuilder.prototype.createActionButton =
  function lsnb_createActionButton(notificationId) {
    var button = document.createElement('span');
    button.classList.add('button-actionable');
    button.dataset.l10nId = 'open-notification';
    button.addEventListener('touchstart', (evt) => {
      button.parentElement.classList.add('activated');
    });

    button.addEventListener('touchend', (evt) => {
      button.parentElement.classList.remove('activated');
      button.classList.add('activated');
      window.dispatchEvent(new CustomEvent('lockscreen-notification-clicked', {
        detail: { 'notificationId': notificationId }
      }));
    });
    return button;
  };

  exports.LockScreenNotificationBuilder = LockScreenNotificationBuilder;
})(window);
