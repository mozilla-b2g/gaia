/*global define*/
'use strict';
define(function(require) {

var templateNode = require('tmpl!./setup_oauth2.html'),
    appSelf = require('app_self'),
    common = require('mail_common'),
    Cards = common.Cards;

function SetupOauth2(domNode, mode, args) {
  this.domNode = domNode;
  this.onBrowserComplete = args.onBrowserComplete;

  this.getElement('sup-back-btn')
    .addEventListener('click', this.onBack.bind(this), false);

  var browserFrame = document.createElement('iframe');
  browserFrame.classList.add('sup-oauth2-browser');
  browserFrame.setAttribute('mozbrowser', true);
  browserFrame.setAttribute('src', args.url);
  browserFrame.addEventListener('mozbrowserlocationchange',
                                this.onLocationChange.bind(this));

  this.getElement('scrollregion-below-header').appendChild(browserFrame);
}

SetupOauth2.prototype = {
  die: function() {
    // The main reason a mozbrowser for this flow, not preserving cookies.
    appSelf.latest('self', function(app) {
      console.log('clearing browser data: ' + app);
      // Each app has two cookie jars, one for the app and one for browsing
      // contexts. This call just clears the browsing context.
      if (app) {
        app.clearBrowserData();
      }
      console.log('browser data cleared');
    });
  },

  getElement: function(className) {
    return this.domNode.getElementsByClassName(className)[0];
  },

  close: function() {
    Cards.removeCardAndSuccessors(this.domNode, 'animate', 1);
  },

  onBack: function(event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    this.onBrowserComplete({
      type: 'oauth2Cancel'
    });

    this.close();
  },

  onLocationChange: function(event) {
    var url = event.detail;

    // If the URL is not an expected app one for the redirect page
    // (set up in the manifest.webapp), then just update the title.
    if (url.indexOf('app:') !== 0 ||
        url.indexOf('cards/oauth2/redirect.html?') === -1) {
      this.getElement('sup-account-header-label').textContent = url;
      return;
    }

    //Start closing the dialog now to avoid the user staring too long at an
    //empty white screen.
    this.close();

    // Should have the data we need now.
    var search = url.split('?')[1] || '';
    var result = {
      type: 'oauth2Complete',
      data: {}
    };

    var elements = search.split('&');
    elements.forEach(function(p) {
      var values = p.split('=');
      result.data[decodeURIComponent(values[0])] =
                                                  decodeURIComponent(values[1]);
    });

    this.onBrowserComplete(result);
  }
};
Cards.defineCardWithDefaultMode(
    'setup_oauth2',
    { tray: false },
    SetupOauth2,
    templateNode
);

return SetupOauth2;
});
