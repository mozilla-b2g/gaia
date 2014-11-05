/**
 * Tests for Firefox Accounts observer API
 *
 * navigator.mozId.watch(), .request(), and .logout().
 */

function unpackAssertion(assertion) {
  var parts = assertion.split('.');
  return {
    header: atob(parts[0]),
    claim: atob(parts[1]),
    payload: atob(parts[3])
  };
}

function FXATests() {
  this._eventNum = 1;
}

FXATests.prototype = {
  _setupCallbacks: function() {
    if (this._running) {
      return;
    }

    var self = this;
    try {
      navigator.mozId.watch({
        wantIssuer: 'firefox-accounts',

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
        },

        onerror: function(error) {
          self.recordEvent('error: ' + JSON.stringify(error), 'error');
        }

      });
    } catch (error) {
      this.recordEvent('error: ' + JSON.stringify(error), 'error');
    }
  },

  /**
   * Bind UI components
   */
  _bindEvents: function() {
    if (this._running) {
      return;
    }

    var self = this;
    var testElementHandlers = {
      'request': function() {
        navigator.mozId.request({
          oncancel: function() {
            self.recordEvent('cancel', 'cancel'); 
          }
        });
      },

      'logout': function() {
        navigator.mozId.logout();
      }
    };

    Object.keys(testElementHandlers).forEach(function(selector) {
      document.getElementById(selector).addEventListener(
        'click', testElementHandlers[selector]);
    });
  },

  recordEvent: function(message, cklass, params) {
    var li = document.createElement('li');
    if (cklass) {
      li.classList.add(cklass);
    }

    var events = document.getElementById('event-stream');
    var html = message;

    if (typeof params === 'object') {
      Object.keys(params).forEach(function(key) {
        html += '<div>' + key + ':</div>';
        html += '<div class="' + key + '">' + params[key] + '</div>';
      });
    }

    li.innerHTML = html;
    events.appendChild(li);
    this._eventNum += 1;
  },

  init: function() {
    this._setupCallbacks();
    this._bindEvents();
    this._running = true;

    this.recordEvent('Starting.  Wait for "ready" message.');
  },
};

window.addEventListener('DOMContentLoaded', function() {
  var fxaTests = new FXATests();
  fxaTests.init();
}, false);

