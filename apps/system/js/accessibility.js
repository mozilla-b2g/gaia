/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

SettingsListener.observe('accessibility.invert', false, function(value) {
  var screen = document.getElementById('screen');
  if (value)
    screen.classList.add('accessibility-invert');
  else
    screen.classList.remove('accessibility-invert');
});

SettingsListener.observe('accessibility.screenreader', false, function(value) {
  var event = document.createEvent('CustomEvent');
  event.initCustomEvent('mozContentEvent', true, true,
                        {type: 'accessibility-screenreader', enabled: value});
  window.dispatchEvent(event);
});
