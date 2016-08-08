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

  var LockScreenNotificationBuilder = function(container) {
    this.container = container;
  };

  LockScreenNotificationBuilder.prototype.start =
  function() {
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
    // it should hide the bottom border.
    var next = node.nextElementSibling;
    if (null !== next && next.classList.contains('actionable')) {
      node.classList.add('previous-actionable');
    }

    node.addEventListener('click',
      this.requestActivate.bind(this, node));
    return node;
  };

  LockScreenNotificationBuilder.prototype.requestActivate =
  function lsnb_requestActivate(node) {
    window.dispatchEvent(new CustomEvent(
      'lockscreen-notification-request-activate', {
        detail: {
           'notificationId' : node.dataset.notificationId
        }
      }));
  };

  exports.LockScreenNotificationBuilder = LockScreenNotificationBuilder;
})(window);
