(function(window) {

  'use strict';

  window.addEventListener('widget-panel-update', function updateHandler(e){
    display(e.detail);
    e.preventDefault();
  });

  function display(data) {
    var target = 'iframe[mozapp="' + data.manifestURL + '"]';
    var iframe = document.querySelector(target);
    if (!iframe) {
      return;
    }

    var appwindow = iframe.parentElement;
    var overlay = appwindow.querySelector('.devtools-layer');

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.classList.add('devtools-layer');
      appwindow.appendChild(overlay);
    }

    if (!data.metrics || data.metrics.length < 1) {
      overlay.remove();
      return;
    }

    var html = '';

    data.metrics.forEach(function(metric) {
      html += widget(metric);
    });

    overlay.innerHTML = html;
  }

  function widget(metric) {
    var value = metric.value;
    if (!value) {
      return '';
    }

    var color;
    switch(metric.name) {
      case 'errors':
        color = 'red';
        break;

      case 'warnings':
        color = 'orange';
        break;

      case 'reflows':
        color = 'purple';
        break;

      default:
        color = colorHash(metric.name);
        break;
    }

    return '<div class=widget style="background-color: ' + color + '">' +
           value + '</div>';
  }

  function colorHash(name) {
    var hue = 0;
    for (var i = 0; i < name.length; i++) {
      hue += name.charCodeAt(i);
    }
    return 'hsl(' + (hue % 360) + ', 75%, 50%)';
  }

})(this);
