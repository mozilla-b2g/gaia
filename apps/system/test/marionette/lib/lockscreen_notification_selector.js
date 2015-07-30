'use strict';

(function (module) {
  var LockScreenNotificationSelector = function () {
    this.Ensure = require('./ensure.js');
    this.assert = require('assert');
    this.inverseMode = false;
    this.selector = {
      // should use it in the frame
      notifications: '#notifications-lockscreen-container .notification'
    };
    // XXX: when it becomes an app, should has its own app info class.
    this.lockScreenFrameOrigin = 'app://lockscreen.gaiamobile.org';
    this.notifications = [];
  };

  LockScreenNotificationSelector.prototype.start =
  function (client) {
    this.client = client;
    return this;
  };

  LockScreenNotificationSelector.prototype.ensure =
  function (condition, name) {
    var ensure = (new this.Ensure()).start(this.client);
    return ensure;
  };

  LockScreenNotificationSelector.prototype.fetch =
  function () {
    this.ensure()
      .frame(this.lockScreenFrameOrigin);
    this.notifications = this.client.findElements(this.selector.notifications);
    return this;
  };

  LockScreenNotificationSelector.prototype.contains =
  function (detail) {
    return 0 !== this.notifications
      .filter((function(element) {
        return this.ensure().validateElement(element);
      }).bind(this))
      .filter((function (element) {
        // We wrap this in a try/catch in case this is called after a .not().
        // Otherwise if the element does not exist in the DOM after being
        // removed it may throw a stale element exception.
        try {
          return this.compareNotificationDetails(detail,
            this.toDetail(element));
        } catch (e) {
          return false;
        }
      }).bind(this)).length;
  };

  LockScreenNotificationSelector.prototype.select =
  function (detail) {
    return this.notifications
      .filter((function(element) {
        return this.ensure().validateElement(element);
      }).bind(this))
      .filter((function (element) {
        return this.compareNotificationDetails(detail, this.toDetail(element));
      }).bind(this))[0];
  };

  // Async method. We can't call the method from Marionette side.
  LockScreenNotificationSelector.prototype.close =
  function (tag) {
    if (!tag) {
      throw new Error('Need a valid tag to get the notification to close');
    }
    this.client.executeAsyncScript(function(tag) {
     window.Notification.get({tag: tag})
      .then(
        function(nt) {
          if (nt.length === 1) {
            nt[0].close();
            marionetteScriptFinished(true);
            return;
          }
          marionetteScriptFinished(false);
        },
        function(nt) {
          marionetteScriptFinished(false);
        });
    }, [tag]);
  };

  /**
   * From MarionetteJS element to detail object.
   */
  LockScreenNotificationSelector.prototype.toDetail =
  function (element) {
    var detail = element.scriptWith(function (node) {
      return {
        title: node.querySelector('.title-container .title')
               .innerHTML,
        body: node.querySelector('.detail .detail-content').innerHTML,
        lang: node.getAttribute('lang'),
        dir: node.getAttribute('data-predefined-dir'),
        manifestURL: node.getAttribute('data-manifest-u-r-l')
      };
    });
    return detail;
  };

  LockScreenNotificationSelector.prototype.compareNotificationDetails =
  function (detailsA, detailsB) {
    if (!detailsA || !detailsB) {
      throw new Error('No comparable things');
    }
    if (detailsA.title && detailsB.title !== detailsA.title) {
      return false;
    }
    if (detailsA.body && detailsB.body !== detailsA.body) {
      return false;
    }
    if (detailsA.lang && detailsB.lang !== detailsA.lang) {
      return false;
    }
    if (detailsA.dir && detailsB.dir !== detailsA.dir) {
      return false;
    }
    return true;
  };

  module.exports = LockScreenNotificationSelector;
})(module);
