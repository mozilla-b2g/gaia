/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function() {
  var host = document.location.host;
  var domain = host.replace(/(^[\w\d]+\.)?([\w\d]+\.[a-z]+)/, '$2');
  var protocol = document.location.protocol + '//';
  var origin = protocol + 'costcontrol.' + domain;

  var widgetContainer = document.getElementById('cost-control-widget');

  function _ensureWidget() {

    if (Applications.ready) {

      // Check widget is there
      var widgetFrame = widgetContainer.querySelector('iframe');
      if (widgetFrame && !widgetFrame.dataset.killed)
        return;

      // Create the widget
      if (!widgetFrame) {
        widgetFrame = document.createElement('iframe');
        widgetFrame.addEventListener('mozbrowsererror',
          function ccdriver_onError(e) {
            e.target.dataset.killed = true;
          }
        );
      }

      widgetFrame.dataset.frameType = 'widget';
      widgetFrame.dataset.frameOrigin = origin;
      delete widgetFrame.dataset.killed;

      widgetFrame.setAttribute('mozbrowser', true);
      widgetFrame.setAttribute('remote', 'true');
      widgetFrame.setAttribute('mozapp', origin + '/manifest.webapp');

      widgetFrame.src = origin + '/widget.html';
      widgetContainer.appendChild(widgetFrame);

      // TODO: Remove this when weird bug #809031 (Bugzilla) is solved
      // See cost_control.css as well to remove the last rule
      var offsetY = document.getElementById('notification-bar').clientHeight;
      offsetY += 
        document.getElementById('notifications-container').clientHeight;
      widgetFrame.style.transform = 'translate(0, ' + offsetY + 'px)';
    }
  }

  // Listen to utilitytray show
  window.addEventListener('utilitytrayshow', _ensureWidget);
  window.addEventListener('applicationready', _ensureWidget);
}());
