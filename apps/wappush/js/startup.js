/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global WapPushManager */

'use strict';

window.addEventListener('load', function callSetup(evt) {
  window.removeEventListener('load', callSetup);

  WapPushManager.init();
});
