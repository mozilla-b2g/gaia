'use strict';

var InputCancelButton = (function inputCancelButton() {

  var selector = 'input[data-cancelable]';

  window.addEventListener('load', function init() {
    initCurrentInputs();
    initMutationsListener();
    initInputListener();
  });

  // Checking current inputs and addingListeners to them
  var initCurrentInputs = function initCurrentInputs() {
    var inputs = document.querySelectorAll(selector);
    for (var i = 0; i < inputs.length; i++) {
      listenForCheck(inputs[i]);
    }
  };

  // Waiting for new input additions to the DOM
  var initMutationsListener = function initMutationsListener() {
    document.addEventListener('animationstart', function(event) {
      if (event.animationName == 'nodeInserted') {
        listenForCheck(event.target);
      }
    }, true);
  };

  // Listening when someone is typing
  var initInputListener = function initInputListener() {
    document.addEventListener('input', function input(event) {
      var target = event.target;
      if (target.tagName != 'INPUT' || !('cancelable' in target.dataset))
        return;

      checkAddingButton(target);
    });
  };

  var listenForCheck = function listenForCheck(input) {
    input.addEventListener('focus', function onFocus(event) {
      checkAddingButton(event.target);
      input.removeEventListener('focus', onFocus);
    });
  };

  var checkAddingButton = function checkAddingButton(input) {
    input.value.length > 0 ? addCancelButton(input) : removeCancelButton(input);
  };

  var addCancelButton = function addCancelButton(input) {
    if (input.classList.contains('cancel-button')) {
      return;
    }

    var parentElement = input.parentNode;
    input.classList.add('cancel-button');
    var cancelButton = document.createElement('span');
    cancelButton.className = 'icon-clear';
    cancelButton.setAttribute('role', 'button');
    var afterInput = input.nextSibling;
    var newElement = parentElement.insertBefore(cancelButton, afterInput);

    newElement.addEventListener('mousedown', function removeText() {
      input.value = '';
      var event = new CustomEvent('cancelInput');
      document.dispatchEvent(event);
    });

    input.addEventListener('blur', function onBlur() {
      removeCancelButton(input);
    });

    input.addEventListener('focus', function onFocus() {
      checkAddingButton(input);
    });
  };

  var removeCancelButton = function removeCancelButton(input) {
    if (!input.classList.contains('cancel-button')) {
      return;
    }

    var parentElement = input.parentNode;
    input.classList.remove('cancel-button');
    parentElement.removeChild(input.nextSibling);
  };

}());
