'use strict';
define(function(require) {

var appSelf = require('app_self'),
    cards = require('cards');

return [
  require('./base_card')(require('template!./setup_oauth2.html')),
  {
    onArgs: function(args) {
      this.onBrowserComplete = args.onBrowserComplete;


      var browserFrame = document.createElement('iframe');
      browserFrame.classList.add('sup-oauth2-browser');
      browserFrame.setAttribute('mozbrowser', true);
      browserFrame.setAttribute('src', args.url);
      browserFrame.addEventListener('mozbrowserlocationchange',
                                    this.onLocationChange.bind(this));

      this.scrollRegion.appendChild(browserFrame);
    },

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

    close: function() {
      cards.removeCardAndSuccessors(this, 'animate', 1);
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
        this.headerLabel.textContent = url;
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
  }
];
});
