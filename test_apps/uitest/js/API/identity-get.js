/**
 * In these tests, we exercise the native navigator.mozId.get method.
 */

function getUnverifiedOk() {
  return document.getElementById('unverified-ok').checked;
}

function getIssuerName() {
  return document.getElementById('issuer-name').value.trim();
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
    var html = message;

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

  this.gotAssertion = function id_gotAssertion(assertion) {
    var result = {assertion: assertion};
    if (assertion) {
      result.unpacked = JSON.stringify(unpackAssertion(assertion), null, 2);
    }
    this.recordEvent('Assertion', 'assertion', result);
  };

  /**
   * Bind UI components
   */
  this._bindEvents = function id__bindEvents() {
    if (this._running) return;
    var gotAssertion = this.gotAssertion.bind(this);
    var self = this;
    var testElementHandlers = {
      't-get': function() {
        navigator.mozId.get(gotAssertion);
      },

      't-get-allowUnverified': function() {
        navigator.mozId.get(gotAssertion, {
          allowUnverified: getUnverifiedOk()
        });
      },

      't-get-forceIssuer': function() {
        navigator.mozId.get(gotAssertion, {
          forceIssuer: getIssuerName()
        });
      },

      't-get-forceIssuer-allowUnverified': function() {
        navigator.mozId.get(gotAssertion, {
          allowUnverified: getUnverifiedOk(),
          forceIssuer: getIssuerName()
        });
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

    this.recordEvent('Tests are ready');
  };
}

window.addEventListener('DOMContentLoaded', function() {
  var identityTests = new IdentityTests();
  identityTests.init();
}, false);

