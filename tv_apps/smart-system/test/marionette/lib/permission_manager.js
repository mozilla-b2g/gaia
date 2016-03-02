'use strict';

var assert = require('chai').assert;

/**
 * A Marionette test helper for calling interactive notification.
 */

/**
 * @constructor
 * @param {Marionette.Client} client Marionette client to use.
 */
function PermissionManager(client) {
  this.client = client.scope({ searchTimeout: 120 * 1000 });
}

module.exports = PermissionManager;

PermissionManager.APP_NAME = 'permission-manager-app';
PermissionManager.APP_HOST = PermissionManager.APP_NAME + '.gaiamobile.org';
PermissionManager.APP_URL = 'app://' + PermissionManager.APP_HOST;

var Selector = PermissionManager.Selector = {};
Selector.screen = '#permission-screen';
Selector.noBtn = Selector.screen + ' smart-button#permission-no';
Selector.yesBtn = Selector.screen + ' smart-button#permission-yes';
Selector.rememberSection = Selector.screen + ' #permission-remember-section';
Selector.rememberCheckbox =
  Selector.rememberSection + ' input#permission-remember-checkbox';
Selector.showMoreInfoBtn =
  Selector.screen + ' smart-button#permission-more-info-link';
Selector.hiddeMoreInfoBtn =
  Selector.screen + ' smart-button#permission-hide-info-link';

PermissionManager.prototype = {

  get screen() {
    return this.client.findElement(Selector.screen);
  },

  get noBtn() {
    return this.client.findElement(Selector.noBtn);
  },

  get yesBtn() {
    return this.client.findElement(Selector.yesBtn);
  },

  get rememberSection() {
    return this.client.findElement(Selector.rememberSection);
  },

  get rememberCheckbox() {
    return this.client.findElement(Selector.rememberCheckbox);
  },

  get hiddeMoreInfoBtn() {
    return this.client.findElement(Selector.hiddeMoreInfoBtn);
  },

  get showMoreInfoBtn() {
    return this.client.findElement(Selector.showMoreInfoBtn);
  },

  waitForPermissionDialogOpened: function () {
    var screen = this.screen;
    this.client.waitFor(function() {
      var classes = screen.getAttribute('class');
      return classes.indexOf('visible') != -1;
    });
    // After opened, focus should be on noBtn by default
    screen.scriptWith(function(screen) {
      return document.activeElement.id == 'permission-no' &&
        document.activeElement.tagName.toLowerCase() == 'smart-button';
    }, function (err, focusOnNoBtn) {
      assert.ok(focusOnNoBtn, 'Not focus on no button after opened');
    });
  },

  waitForPermissionDialogClosed: function () {
    var screen = this.screen;
    this.client.waitFor(function() {
      var classes = screen.getAttribute('class');
      return classes.indexOf('visible') == -1;
    });
    // After closing, focus should be on background app
    screen.scriptWith(function(screen) {
      return document.activeElement.getAttribute('src');
    }, function (err, src) {
      assert.equal(src, PermissionManager.APP_URL + '/index.html',
        'Not focus on app after closed');
    });
  },

  watiForMoreInfoOpened: function () {
    var screen = this.screen;
    this.client.waitFor(function() {
      var classes = screen.getAttribute('class');
      return classes.indexOf('more-info') != -1;
    });
  },

  watiForMoreInfoClosed: function () {
    var screen = this.screen;
    this.client.waitFor(function() {
      var classes = screen.getAttribute('class');
      return classes.indexOf('more-info') == -1;
    });
  },

  watiForRememberCheckboxChecked: function () {
    this.rememberCheckbox.scriptWith(function(checkbox) {
      return checkbox.checked;
    }, function (err, checked) {
      assert.ok(checked, 'Remember checkbox is not checked');
    });
  },

  watiForRememberCheckboxUnchecked: function () {
    this.rememberCheckbox.scriptWith(function(checkbox) {
      return checkbox.checked;
    }, function (err, checked) {
      assert.ok(checked === false, 'Remember checkbox should not be checked');
    });
  }
};
