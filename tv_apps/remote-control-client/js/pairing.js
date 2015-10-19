'use strict';

(function(exports) {
  // The .sjs file is located in the Gecko since it needs chrome privilege.
  var AJAX_URL = 'pairing.sjs';

  function showMessage(message, isError) {
    var divMessage = document.getElementById('pairing-message');
    divMessage.textContent = message;
    divMessage.classList[isError ? 'add' : 'remove']('error');
  }

  function init() {
    var codes = [].slice.call(document.querySelectorAll('#pairing-code input'));
    var btnSubmit = document.getElementById('connect');
    var btnRestartPairing = document.getElementById('restart-pairing');

    codes.forEach(function(code, index) {
      code.value = '';
      code.placeholder = '-';

      code.addEventListener('focus', function() {
        this.placeholder = '';
        this.select();
      });

      code.addEventListener('blur', function() {
        this.placeholder = '-';
      });

      code.addEventListener('keydown', function(evt) {
        var c = evt.keyCode;

        // backspace to previous field
        if (c == 8 && !this.value && index > 0) {
          codes[index - 1].value = '';
          codes[index - 1].focus();
          evt.preventDefault();
          return;
        }

        // numbers
        if ((c >= 48 && c <= 57) || (c >= 96 && c <= 105)) {
          this.value = String.fromCharCode(c >= 96 ? c - 96 + 48 : c);
          if (index < 3) {
            codes[index + 1].focus();
          } else {
            btnSubmit.focus();
          }
          evt.preventDefault();
          return;
        }

        // allowed function keys: backspace, tab, shift, del and F5
        if ([8, 9, 16, 46, 116].indexOf(c) < 0) {
          evt.preventDefault();
          return;
        }
      });
    });

    btnRestartPairing.addEventListener('click', function() {
      window.location.reload();
    });

    btnSubmit.disabled = false;
    btnSubmit.addEventListener('click', function(evt) {
      var pincode = '';
      var hasEmptyCode = codes.some(function(code) {
        if (!code.value) {
          code.focus();
          return true;
        }
        pincode += code.value;
      });
      if (hasEmptyCode) {
        return;
      }

      btnSubmit.disabled = true;

      var onerror = function(message) {
        codes.forEach(function(code) {
          code.value = '';
        });
        btnSubmit.disabled = false;
        showMessage(message, true);
      };

      exports.sendMessage(
        AJAX_URL,
        {
          message: JSON.stringify({ pincode: pincode })
        },
        function success(data) {
          if (data) {
            if (data.verified) {
              document.l10n.formatValue('connect-success')
                .then(function(value) {
                  showMessage(value);
                  // The cookie will be used by server via http header.
                  exports.setCookie('uuid', data.uuid);
                  setTimeout(function() {
                    // Server will help redirecting to client.html when there is
                    // a UUID in cookie.
                    window.location.reload();
                  }, 1000);
                });
            } else if (data.reason == 'expired') {
              document.l10n.formatValue('pin-code-expired-message')
                .then(onerror);
              document.getElementById('pairing-container')
                .classList.add('pin-code-expired');
            } else {
              document.l10n.formatValue('wrong-pin').then(onerror);
            }
          } else {
            document.l10n.formatValue('connect-error-invalid-response')
              .then(onerror);
          }
        },
        function error(status) {
          document.l10n.formatValue('connect-error', {status: String(status)})
            .then(onerror);
        }
      );
    });
  }

  exports.ready(init);
}(window));
