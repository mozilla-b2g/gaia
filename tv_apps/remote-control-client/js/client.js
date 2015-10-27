/* global PanelElement */
'use strict';

(function(exports) {
  // The .sjs file is located in the Gecko since it needs chrome privilege.
  var AJAX_URL = 'client.sjs';

  function sendMessage(type, detail, success, error) {
    var data = {
      type: type,
      detail: (typeof detail === 'object') ? detail : detail.toString()
    };
    exports.sendMessage(AJAX_URL, {
      message: JSON.stringify(data)
    }, success, error);
  }

  function init() {
    var input = document.getElementById('input-string');
    var btnSend = document.getElementById('send-string');

    input.value = '';
    input.addEventListener('keydown', function(evt) {
      switch(evt.keyCode) {
        case 13: //Enter
          setTimeout(function() {
            document.activeElement.blur();
            sendMessage('input', {
              clear: true,
              string: input.value,
              keycode: 13
            });
          });
          break;
        case 27: //Escape
          input.value = '';

          // Workaround Firefox's bug
          input.blur();
          input.focus();
          break;
        default:
          return;
      }
      evt.preventDefault();
    });

    input.addEventListener('focus', function() {
      // The "select()" doesn't work if it's triggered in a "focus()" handler.
      setTimeout(function() {
        input.select();
      });
    });

    btnSend.addEventListener('click', function() {
      sendMessage('input', {
        clear: true,
        string: input.value,
        keycode: 13
      });
    });

    /* jshint nonew: false */
    new PanelElement(document.getElementById('touch-panel'), {
      touchingClass: 'touching',
      dblClickTimeThreshold: 0,
      handler: sendMessage
    });

    /* jshint nonew: false */
    new PanelElement(document.getElementById('scroll-panel'), {
      touchingClass: 'touching',
      dblClickTimeThreshold: 0,
      clickTimeThreshold: 0,
      clickMoveThreshold: 0,
      handler: function(type, detail) {
        if (detail.dx !== undefined) {
          detail.dx = 0;
        }
        sendMessage(type.replace('touch', 'scroll'), detail);
      }
    });

    var buttonOnClick = function() {
      var key = this.dataset.key;
      if (key) {
        sendMessage('keypress', key);
      } else if (this.id == 'pin-to-home') {
        sendMessage('custom', {
          action: 'pin-to-home'
        });
      }
    };

    var buttons = document.querySelectorAll('#section-buttons .button');
    [].slice.call(buttons).forEach(function(elem) {
      elem.addEventListener('click', buttonOnClick);
    });
  }

  exports.ready(init);
}(window));
