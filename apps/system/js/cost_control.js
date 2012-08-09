/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function () {
  var host = document.location.host;
  var domain = host.replace(/(^[\w\d]+\.)?([\w\d]+\.[a-z]+)/, '$2');
  var protocol = document.location.protocol + '//';
  var origin = protocol + 'costcontrol.' + domain;

  var widgetContainer = document.getElementById('cost-control-widget');
  var widgetFrame = document.createElement('iframe');
  widgetFrame.setAttribute('mozbrowser', true);
  widgetFrame.setAttribute('mozapp', origin + '/manifest.webapp');
  widgetFrame.src = origin + '/widget.html';
  widgetFrame.dataset.frameOrigin = origin;
  widgetContainer.appendChild(widgetFrame);

  function _redirectToWidget(evt) {
    console.log('redirecting ' + evt.type);
    widgetFrame.contentWindow.postMessage({
      type: evt.type
    }, '*');
  }

  // Listen to utilitytray show
  window.addEventListener('utilitytrayshow', _redirectToWidget);

  // TODO: Remove when bug https://bugzilla.mozilla.org/show_bug.cgi?id=766873
  // is resolved. The problem is we cannot get the background service from 
  // an application via window.open when it is launch from background_page in 
  // manifest so we need to launch the service from the widget but only when the
  // system is aware about the application is installed. 
  //
  // So we need to redirect the event applicationready to the widget in order
  // to setup everything else.
  window.addEventListener('applicationready', _redirectToWidget);
}());
