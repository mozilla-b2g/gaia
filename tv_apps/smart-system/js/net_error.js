/* global KeyEvent */
/* global SimpleKeyNavigation */
/* global SharedUtils */

(function(exports) {
  'use strict';

  /**
   * Parse the neterror information that's sent to us as part of the documentURI
   * and return an error object.
   *
   * The error object will contain the following attributes:
   * e - Type of error (eg. 'netOffline').
   * u - URL that generated the error.
   * m - Manifest URI of the application that generated the error.
   * c - Character set for default gecko error message (eg. 'UTF-8').
   * d - Default gecko error message.
   * f - The frame type ("regular", "browser", "app")
   */
  function getErrorFromURI() {
    var error = {},
        uri = document.documentURI;

    // Quick check to ensure it's the URI format we're expecting.
    if (!uri.startsWith('about:neterror?')) {
      // A blank error will generate the default error message (no network).
      return error;
    }

    // Small hack to get the URL object to parse the URI correctly.
    var url = new URL(uri.replace('about:', 'http://'));

    // Set the error attributes.
    ['e', 'u', 'm', 'c', 'd', 'f'].forEach(
      function(v) {
        error[v] = url.searchParams.get(v);
      }
    );

    switch (error.e) {
      case 'connectionFailure':
      case 'netInterrupt':
      case 'netTimeout':
      case 'netReset':
        error.e = 'connectionFailed';
        break;

      case 'unknownSocketType':
      case 'unknownProtocolFound':
      case 'cspFrameAncestorBlocked':
        error.e = 'invalidConnection';
        break;
    }

    return error;
  }

  var ErrorView = function(error) {
    this.error = error;

    this.viewEl = null;

    this.titleEl = null;

    this.messageEl = null;

    this.retryBtnEl = null;

    this.closeBtnEl = null;

    this.isFramed = this.isViewFramed(this.error);

    this.init();
  };

  ErrorView.prototype = {
    init: function ew_init() {
      var template = document.getElementById('net-error-confirm-dialog');

      window.LazyLoader.load(template, (function() {
        this.viewEl = document.getElementById('net-error-confirm-dialog');
        this.titleEl = document.getElementById('error-title');
        this.messageEl = document.getElementById('error-message');
        this.retryBtnEl = document.getElementById('retry-btn');
        this.closeBtnEl = document.getElementById('close-btn');
        this.applyStyle();
        this.populateMessages();
        this.addHandlers();
      }).bind(this));
    },

    isViewFramed: function  ew_isViewFramed(error) {
      var manifestURL = error.m;

      // frame type values (regular, browser, app)
      var frameType = error.f;
      switch (frameType) {

        // if we are in a "regular" frame, we are indeed framed
        case 'regular':
          return true;

        // if we are an "app" frame, we are not framed
        case 'app':
          return false;

        // If we are in a "browser" frame, we are either in a browser tab/system
        // bookmark, or mozbrowser iframe within in app. Since system
        // bookmarks are considered unframed, we must perform a check here to
        // distinguish between the two cases.
        case 'browser':
          return manifestURL !== window.SYSTEM_MANIFEST;

        default:
          throw new Error('about:netError: invalid frame type - ' + frameType);
      }
    },

    applyStyle: function ew_applyStyle() {
      this.viewEl.classList.add(this.error.e);
      if (this.isFramed) {
        this.viewEl.classList.add('net-error-dialog-framed');
      }
    },

    populateMessages: function ew_populateMessages() {
      var titleL10nId = '',
          messageL10nId = '',
          messageL10nOption = null;

      switch(this.error.e){
        case 'netOffline':
          titleL10nId = 'net-error-net-off-line-title';
          if (this.isFramed) {
            messageL10nId = 'network-error-launching';
            messageL10nOption = {name: this.error.u};
          } else {
            messageL10nId = 'net-error-net-off-line-message';
          }
          break;
        case 'dnsNotFound':
          titleL10nId = 'server-not-found';
          messageL10nId = 'server-not-found-error';
          messageL10nOption = {name: this.error.u};
          break;
        case 'connectionFailed':
          titleL10nId = 'connection-failed';
          messageL10nId = 'connection-failed-error';
          break;
        case 'invalidConnection':
          titleL10nId = 'invalid-connection';
          messageL10nId = 'invalid-connection-error';
          break;
        default:
          titleL10nId = 'unable-to-connect';
          messageL10nId = this.error.d;
      }

      document.l10n.setAttributes(this.titleEl, titleL10nId);
      document.l10n.setAttributes(this.messageEl, messageL10nId,
        messageL10nOption);
    },

    addHandlers: function ew_addHandlers() {
      var navBtns = [],
          keyNav = null;
      document.addEventListener('keydown', this.handleKeydown.bind(this));

      if (!this.isFramed) {
        navBtns.push(this.closeBtnEl);
        this.closeBtnEl.addEventListener('click', this.close);
        this.closeBtnEl.addEventListener('keydown',
          this.handleCloseButtonKeydown.bind(this));
      }

      navBtns.push(this.retryBtnEl);
      this.retryBtnEl.addEventListener('click', this.reload);
      this.retryBtnEl.addEventListener('keydown',
          this.handleRetryButtonKeydown.bind(this));

      keyNav = new SimpleKeyNavigation();
      keyNav.start(navBtns, SimpleKeyNavigation.DIRECTION.HORIZONTAL);
      keyNav.focusOn(this.retryBtnEl);
    },

    handleKeydown: function ew_handleKeydown(e) {
      if (SharedUtils.isBackKey(e)) {
        this.close();
      }
    },

    handleCloseButtonKeydown: function ew_handleCloseButtonKeydown(e) {
      if (e.keyCode === KeyEvent.DOM_VK_RETURN) {
        this.close();
      }
    },

    handleRetryButtonKeydown: function ew_handleRetryButtonKeydown(e) {
      if (e.keyCode === KeyEvent.DOM_VK_RETURN) {
        this.reload();
      }
    },

    reload: function ew_reload() {
      // When reloading a page with POSTDATA the user will be prompted to
      // confirm if he wants to resend the data. If the user accepted to resend
      // the data, during the reload function call the onbeforeunload event is
      // fired, otherwise if the event is not triggered then the last url from
      // the history is loaded.
      var isReloading = false;
      window.addEventListener('beforeunload', function onBeforeunload() {
        isReloading = true;
      });

      window.location.reload(true);

      if (!isReloading) {
        history.back();
      }
    },

    close: function ew_close() {
      window.close();
    },

  };

  var NetError = {
    create: function create() {
      var error = getErrorFromURI();
      if (error) {
        return new ErrorView(error);
      }
    }
  };

  document.l10n.ready.then(() => {NetError.create();});
  document.addEventListener('DOMRetranslated', NetError.create);

  exports.NetError = NetError;
})(window);
