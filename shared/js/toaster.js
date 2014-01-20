/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * XXX: Toaster create a HTML structure like this:
 *   <section role="status" hidden>
 *     <p></p>
 *   </section>
 * and insert it to the bottom of <body> (or any other element you specified.)
 * This HTML structure depends on styles declared in shared/style/status.css
 */

var Toaster = {
  _containerElement: null,
  _messageElement: null,
  _defaultLatency: 3000,
  _maxLatency: 5000,
  _toastQueue: [],
  _parentElement: null,
  _toastVisibleClass: 'toast-visible',

  _isBacklogged: function t_isBacklogged() {
    return this._toastQueue.length > 0;
  },

  _isBusy: function t_isBusy() {
    return this._containerElement.classList.contains(this._toastVisibleClass);
  },

  _showContainerElement: function t_showContainerElement() {
    if (this._containerElement) {
      this._containerElement.classList.add(this._toastVisibleClass);
      this._containerElement.hidden = false;
    }
  },

  _hideContainerElement: function t_hideContainerElement(useTransition) {
    if (this._containerElement) {
      this._containerElement.classList.remove(this._toastVisibleClass);
      if (!useTransition) {
        this._containerElement.hidden = true;
        if (this._messageElement) {
          this._messageElement.textContent = '';
          navigator.mozL10n.localize(this._messageElement, '');
        }
      }
    }
  },

  _onTransitionEnd: function t_onTransitionEnd(e) {
    if (!this._containerElement.classList.contains(this._toastVisibleClass)) {
      this._hideContainerElement();
    }
  },

  _produceToast: function t_producetToast(messageId, messageArgs,
                                          latency, useTransition) {
    this._toastQueue.push({
      messageL10nId: messageId,
      messageL10nArgs: messageArgs,
      latency: Math.min(latency || this._defaultLatency, this._maxLatency),
      useTransition: useTransition
    });
    // if toaster is busy, don't bother to call it to consume toast
    if (!this._isBusy()) {
      this._consumeToast();
    }
  },

  _consumeToast: function t_consumeToast() {
    var self = this;
    var toast = null;
    if (self._isBacklogged()) {
      toast = self._toastQueue.shift();
      self._messageElement.textContent = '';
      navigator.mozL10n.localize(
        self._messageElement, toast.messageL10nId, toast.messageL10nArgs);
      self._showContainerElement();
      setTimeout(function() {
        self._hideContainerElement(toast.useTransition);
        self._consumeToast();
      }, toast.latency);
    }
  },

  _destroy: function t_destroy() {
    this._toastQueue = [];
    if (this._containerElement) {
      this._containerElement.removeEventListener(
        'transitionend', Toaster._onTransitionEnd);
    }
    if (this._parentElement && this._containerElement) {
      this._parentElement.removeChild(this._containerElement);
    }
    this._messageElement = null;
    this._containerElement = null;
  },

  get containerElement() {
    return this._containerElement;
  },

  get messageElement() {
    return this._messageElement;
  },

  initialize: function t_initialize(parentElement) {
    var existedToastContainer =
      document.querySelector('section[role="status"]');
    // Remove existing element of toast
    // This case only exists in unit test
    if (existedToastContainer) {
      existedToastContainer.parentNode.removeChild(existedToastContainer);
    }
    this._destroy();
    this._containerElement = document.createElement('section');
    this._containerElement.setAttribute('role', 'status');
    this._hideContainerElement();
    this._messageElement = document.createElement('p');
    this._containerElement.appendChild(this._messageElement);
    this._parentElement = parentElement || document.body;
    this._parentElement.appendChild(this._containerElement);
    this._containerElement.addEventListener(
      'transitionend', Toaster._onTransitionEnd);
  },

  isInitialized: function t_isInitialized() {
    return (this._containerElement &&
            this._messageElement &&
            this._toastQueue);
  },

  // XXX: if you set useTransition to true, you must ensure that
  // transition style does exist on the element.
  // Argument 'options' are plain object containing properties below:
  //   messageL10nId: message l10n id
  //   messageL10nArgs: message l10n arguments (optional)
  //   latency: latency to show toast, in milliseconds
  //   useTransition: true/false (optional)
  showToast: function t_showToast(options) {
    // make sure toaster is initialized
    if (!this.isInitialized()) {
      this.initialize();
    }
    this._produceToast(
      options.messageL10nId,
      options.messageL10nArgs,
      options.latency,
      options.useTransition);
  }
};
