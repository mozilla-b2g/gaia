/**
 * The IdentityTests are meant to be exercised from marionette as part of the
 * gaia-ui-tests suites.
 */

function getUnverifiedOk() {
  return document.getElementById("unverified-ok").checked;
}

function getIssuerName() {
  return document.getElementById("issuer-name").value.trim();
}

function unpackAssertion(assertion) {
  var parts = assertion.split(".");
  return {
    header: atob(parts[0]),
    claim: atob(parts[1]),
    payload: atob(parts[3])
  };
}

var testElementHandlers = {
  't-request': function() {
    navigator.id.request();
  },

  't-request-allowUnverified': function() {
    navigator.id.request({ 
      allowUnverified: getUnverifiedOk() 
    });
  },

  't-request-forceIssuer': function() {
    navigator.id.request({ 
      forceIssuer: getIssuerName()
    });
  },

  't-request-forceIssuer-allowUnverified': function() {
    navigator.id.request({
      allowUnverified: getUnverifiedOk(),
      forceIssuer: getIssuerName()
    });
  },

  't-logout': function() {
    navigator.id.logout();
  }
};

var IdentityTests = {
  _eventNum: 1,

  /**
   * make a note in the event stream
   *
   * message is the main text of the note
   * cklass is the css class to apply to the enclosing li
   * params is an optional dictionary of strings to append as divs
   */
  recordEvent: function id_recordEvent(message, cklass, params) {
    var li = document.createElement('li');
    if (cklass) {
      li.classList.add(cklass);
    }

    var events = document.getElementById('event-stream');
    var html = "<span>" + this._eventNum + "</span> " + message;

    if (typeof params === 'object') {
      Object.keys(params).forEach(function(key) {
        html += "<div>" + key + ":</div>";
        html += "<div class='" + key + "'>" + params[key] + "</div>";
      });
    }

    li.innerHTML = html;
    events.appendChild(li);
    this._eventNum += 1;
  },

  init: function id_init() {
    var self = this;
    window.addEventListener("DOMContentLoaded", function() {
      // Set up identity calbacks
      try {
        navigator.id.watch({
          loggedInUser: null,

          onlogin: function(assertion) {
            var unpacked = JSON.stringify(unpackAssertion(assertion), null, 2);
            self.recordEvent("login", 'login', {assertion: assertion, unpacked: unpacked});
          },

          onlogout: function() {
            self.recordEvent("logout", 'logout');
          },

          onready: function() {
            self.recordEvent("ready", 'ready');
          },

          oncancel: function() {
            self.recordEvent("cancel", 'cancel');
          }
        });
      } catch (err) {
        self.recordEvent("Error: " + err, 'error');
      }

      // Bind selectors and onclick callbacks
      Object.keys(testElementHandlers).forEach(function(selector) {
        document.getElementById(selector).addEventListener(
          'click', testElementHandlers[selector]);
      });

      self.recordEvent("Ready to rock");
    });
  }
};

IdentityTests.init();

