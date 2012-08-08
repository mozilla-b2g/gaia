/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function () {
  var host = document.location.host;
  var domain = host.replace(/(^[\w\d]+\.)?([\w\d]+\.[a-z]+)/, '$2');
  var protocol = document.location.protocol + '//';
  var url = protocol + 'costcontrol.' + domain;

  var widgetFrame = document.getElementById('cost-control-widget');
  widgetFrame.setAttribute('mozbrowser', 'mozbrowser');
  widgetFrame.setAttribute('mozapp', url + '/manifest.webapp');
  widgetFrame.src = url + '/widget.html';  

  function _redirectToWidget(evt) {
    widgetFrame.contentWindow.postMessage({
      type: evt.type
    }, '*');
  }

  // Listen to utilitytray show
  window.addEventListener('utilitytrayshow', _redirectToWidget);
}());
