/**
 * The IdentityTests are meant to be exercised from marionette as part of the
 * gaia-ui-tests suites.
 *
 * In these tests, we exercise the native navigator.mozId directly.
 */

function getUnverifiedOk() {
  return document.getElementById('unverified-ok').checked;
}

function getIssuerName() {
  return document.getElementById('issuer-name').value.trim();
}

function getWantIssuerName() {
  return document.getElementById('wantIssuer-name').value.trim();
}

function unpackAssertion(assertion) {
  var parts = assertion.split('.');
  return {
    header: atob(parts[0]),
    claim: atob(parts[1]),
    payload: atob(parts[3])
  };
}

function IdentityTests() {

  /**
   * recordEvent: make a note in the event stream
   *
   * message is the main text of the note
   * cklass is the css class to apply to the enclosing li
   * params is an optional dictionary of strings to append as divs
   */
  this._eventNum = 1;
  this.recordEvent = function id_recordEvent(message, cklass, params) {
    var li = document.createElement('li');
    if (cklass) {
      li.classList.add(cklass);
    }

    var events = document.getElementById('event-stream');
    var html = '<span>' + this._eventNum + '</span> ' + message;

    if (typeof params === 'object') {
      Object.keys(params).forEach(function(key) {
        html += '<div>' + key + ':</div>';
        html += "<div class='" + key + "'>" + params[key] + '</div>';
      });
    }

    li.innerHTML = html;
    events.appendChild(li);
    this._eventNum += 1;
  };

  this._setupCallbacks = function id__setupCallbacks() {
    var self = this;
    var wantIssuer = getWantIssuerName();
    try {
      navigator.mozId.watch({
        loggedInUser: null,

        wantIssuer: wantIssuer,

        onlogin: function(assertion) {
          var unpacked = JSON.stringify(unpackAssertion(assertion), null, 2);
          self.recordEvent('login', 'login',
            {assertion: assertion, unpacked: unpacked});
        },

        onlogout: function() {
          self.recordEvent('logout', 'logout');
        },

        onready: function() {
          self.recordEvent('ready', 'ready');
          self._enableButtons();
        }
      });
    } catch (err) {
      this.recordEvent('Error: ' + err, 'error');
    }
  };

  this._enableButtons = function id__enableButtons() {
    ['t-request', 't-request-withOnCancel',
     't-request-allowUnverified', 't-request-forceIssuer',
     't-request-forceIssuer-allowUnverified',
     't-request-wantIssuer',
     't-logout'].forEach(function(selector) {
      document.getElementById(selector).disabled = false;
    });
  };

  /**
   * Bind UI components
   */
  this._bindEvents = function id__bindEvents() {
    if (this._running) return;
    var self = this;
    var testElementHandlers = {
      't-watch': function() {
        self._setupCallbacks();
       },
      't-request': function() {
        navigator.mozId.request();
      },

      't-request-withOnCancel': function() {
        navigator.mozId.request({
          oncancel: function() { self.recordEvent('cancel', 'cancel') }
        });
      },

      't-request-allowUnverified': function() {
        navigator.mozId.request({
          allowUnverified: getUnverifiedOk()
        });
      },

      't-request-forceIssuer': function() {
        navigator.mozId.request({
          forceIssuer: getIssuerName()
        });
      },

      't-request-forceIssuer-allowUnverified': function() {
        navigator.mozId.request({
          allowUnverified: getUnverifiedOk(),
          forceIssuer: getIssuerName()
        });
      },

      't-request-wantIssuer': function() {
        navigator.mozId.request({
          wantIssuer: getWantIssuerName()
        });
      },

      't-logout': function() {
        navigator.mozId.logout();
      }
    };

    Object.keys(testElementHandlers).forEach(function(selector) {
      document.getElementById(selector).addEventListener(
        'click', testElementHandlers[selector]);
    });
  };

  this.init = function id_init() {
    this._bindEvents();
    this._running = true;

    this.recordEvent('Ready to rock');
  };
}

window.addEventListener('DOMContentLoaded', function() {
  var identityTests = new IdentityTests();
  identityTests.init();
}, false);

