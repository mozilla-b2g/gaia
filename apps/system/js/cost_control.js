/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

(function() {

  'use strict';
  /* global Applications, asyncStorage */

  var host = document.location.host;
  var domain = host.replace(/(^[\w\d]+\.)?([\w\d]+\.[a-z]+)/, '$2');
  var protocol = document.location.protocol + '//';
  var origin = protocol + 'costcontrol.' + domain;

  var widgetContainer = document.getElementById('cost-control-widget');

  var widgetFrame;
  function _ensureWidget() {
    if (!Applications.ready) {
      return;
    }

    if (!Applications.getByManifestURL(origin + '/manifest.webapp')) {
      return;
    }

    // Check widget is there
    widgetFrame = widgetContainer.querySelector('iframe');
    if (widgetFrame) {
      return;
    }

    // Create the widget
    if (!widgetFrame) {
      widgetFrame = document.createElement('iframe');
      widgetFrame.addEventListener('mozbrowsererror', _onError);
      widgetFrame.addEventListener('mozbrowserclose', _onError);
    }

    widgetFrame.dataset.frameType = 'widget';
    widgetFrame.dataset.frameOrigin = origin;

    widgetFrame.setAttribute('mozbrowser', true);
    widgetFrame.setAttribute('remote', 'true');
    widgetFrame.setAttribute('mozapp', origin + '/manifest.webapp');

    widgetFrame.src = origin + '/widget.html';
    widgetContainer.appendChild(widgetFrame);

    _attachNetworkEvents();
  }

  function _onError(e) {
    widgetContainer.removeChild(widgetFrame);
    widgetFrame = null;
  }

  function _attachNetworkEvents() {
    window.removeEventListener('moznetworkupload', _onNetworkActivity);
    window.removeEventListener('moznetworkdownload', _onNetworkActivity);
    window.addEventListener('moznetworkupload', _onNetworkActivity);
    window.addEventListener('moznetworkdownload', _onNetworkActivity);
  }

  var hashMark = 0;
  var activityCounter = 0;
  var ACTIVITY_THRESHOLD = 75;
  function _onNetworkActivity() {
    activityCounter++;
    if (activityCounter === ACTIVITY_THRESHOLD) {
      activityCounter = 0;
      window.removeEventListener('moznetworkupload', _onNetworkActivity);
      window.removeEventListener('moznetworkdownload', _onNetworkActivity);
      widgetFrame.addEventListener('mozbrowserlocationchange', _onUpdateDone);
      widgetFrame.src = origin + '/widget.html#update#' + hashMark;
      hashMark = 1 - hashMark; // toogle between 0 and 1
    }
  }

  function _onUpdateDone(evt) {
    if (evt.detail.split('#')[1] === 'updateDone') {
      widgetFrame.removeEventListener('mozbrowserlocationchange',
                                      _onUpdateDone);
      _attachNetworkEvents();
    }
  }

  function _showWidget() {
    _ensureWidget();
    widgetFrame.setVisible(true);
  }

  function _hideWidget() {
    if (widgetFrame) {
      widgetFrame.setVisible(false);
    }
  }

  // Listen to utilitytray show
  window.addEventListener('utilitytrayshow', _showWidget);
  window.addEventListener('utilitytrayhide', _hideWidget);

  window.addEventListener('applicationready', function _onReady() {
    asyncStorage.getItem('ftu.enabled', function _onValue(enabled) {
      if (enabled !== false) {
        window.addEventListener('ftudone', function ftudone(e) {
          window.removeEventListener('ftudone', ftudone);
          _ensureWidget();
          widgetFrame.setVisible(false);
        });
      } else {
        _ensureWidget();
        widgetFrame.setVisible(false);
      }
    });
  });
}());
