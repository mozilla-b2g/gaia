define(function(require, exports, module) {
'use strict';

var QueryString = require('querystring');
var View = require('view');

require('dom!oauth2');

/**
 * Creates a oAuth dialog given a set of parameters.
 *
 *    var oauth = new OAuthWindow(
 *      elementContainer,
 *      'https://accounts.google.com/o/oauth2/auth',
 *      {
 *        response_type: 'code',
 *        client_id: 'xxx',
 *        scope: 'https://www.googleapis.com/auth/calendar',
 *        redirect_uri: 'xxx',
 *        state: 'foobar',
 *        access_type: 'offline',
 *        approval_prompt: 'force'
 *      }
 *    );
 *
 *    oauth.oncomplete = function(evt) {
 *      if (evt.detail.code) {
 *        // success
 *      }
 *    };
 *
 *    oauth.onabort = function() {
 *      // oauth was aborted
 *    };
 *
 *
 */
function OAuthWindow(container, server, params) {
  if (!params.redirect_uri) {
    throw new Error(
      'must provide params.redirect_uri so oauth flow can complete'
    );
  }

  this.params = {};
  for (var key in params) {
    this.params[key] = params[key];
  }

  this._element = container;

  View.call(this);
  this.target = server + '?' + QueryString.stringify(params);

  this._handleUserTriggeredClose =
    this._handleUserTriggeredClose.bind(this);
}
module.exports = OAuthWindow;

OAuthWindow.prototype = {
  __proto__: View.prototype,

  get element() {
    return this._element;
  },

  get isOpen() {
    return !!this.browserFrame;
  },

  selectors: {
    browserHeader: 'gaia-header',
    browserTitle: 'gaia-header > h1',
    browserContainer: '.browser-container'
  },

  get browserContainer() {
    return this._findElement('browserContainer', this.element);
  },

  get browserTitle() {
    return this._findElement('browserTitle', this.element);
  },

  get browserHeader() {
    return this._findElement('browserHeader', this.element);
  },

  _handleFinalRedirect: function(url) {
    this.close();

    if (this.oncomplete) {
      var params;

      // find query string
      var queryStringIdx = url.indexOf('?');
      if (queryStringIdx !== -1) {
        params = QueryString.parse(url.slice(queryStringIdx + 1));
      }

      this.oncomplete(params || {});
    }
  },

  _handleLocationChange: function(url) {
    this.browserTitle.textContent = url;
  },

  _handleUserTriggeredClose: function() {
    // close the oauth flow
    this.close();

    // trigger an event so others can cleanup
    if (this.onabort) {
      this.onabort();
    }
  },

  handleEvent: function(event) {
    switch (event.type) {
      case 'mozbrowserlocationchange':
        var url = event.detail;
        if (url.indexOf(this.params.redirect_uri) === 0) {
          return this._handleFinalRedirect(url);
        }
        this._handleLocationChange(url);
        break;
    }
  },

  open: function() {
    if (this.browserFrame) {
      throw new Error('attempting to open frame while another is open');
    }

    // add the active class
    this.element.classList.add(View.ACTIVE);

    // handle cancel events
    this.browserHeader.addEventListener(
      'action', this._handleUserTriggeredClose
    );

    // setup browser iframe
    var iframe = this.browserFrame =
      document.createElement('iframe');

    iframe.setAttribute('mozbrowser', true);
    iframe.setAttribute('src', this.target);

    this.browserContainer.appendChild(iframe);

    iframe.addEventListener('mozbrowserlocationchange', this);
  },

  close: function() {
    if (!this.isOpen) {
      return;
    }

    this.browserFrame.removeEventListener(
      'mozbrowserlocationchange', this
    );

    this.browserHeader.removeEventListener(
      'action', this._handleUserTriggeredClose
    );

    this.element.classList.remove(View.ACTIVE);

    this.browserFrame.parentNode.removeChild(
      this.browserFrame
    );

    this.browserFrame = undefined;
  }
};

});
