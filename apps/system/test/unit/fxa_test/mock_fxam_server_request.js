/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';
/* exported MockFxModuleServerRequest */

var MockFxModuleServerRequest = {
  error: false,
  registered: false,
  authenticated: false,
  accountCreated: false,
  resetSuccess: false,
  checkEmail: function(email, onsuccess, onerror) {
    if (!this.error) {
      setTimeout(function() {
        var params = {
          registered: this.registered
        };
        onsuccess && onsuccess(params);
      }.bind(this));
    } else {
      onerror && onerror();
    }
  },
  signIn: function(email, password, onsuccess, onerror) {
    if (!this.error) {
      setTimeout(function() {
        var params = {
          authenticated: this.authenticated
        };
        onsuccess && onsuccess(params);
      }.bind(this));
    } else {
      onerror && onerror();
    }
  },
  signUp: function(email, password, onsuccess, onerror) {
    if (!this.error) {
      setTimeout(function() {
        var params = {
          accountCreated: this.accountCreated
        };
        onsuccess && onsuccess(params);
      }.bind(this));
    } else {
      onerror && onerror();
    }
  },
  requestPasswordReset: function(email, onsuccess, onerror) {
    if (!this.error) {
      setTimeout(function() {
        var params = {
          success: this.resetSuccess
        };
        onsuccess && onsuccess(params);
      }.bind(this));
    } else {
      onerror && onerror();
    }
  }
};
