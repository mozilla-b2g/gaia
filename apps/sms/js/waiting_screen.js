/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/*exported WaitingScreen */

'use strict';

var WaitingScreen = {
  show: function ws_show() {
    var link = document.querySelector(
      'link[rel="import"][href="waiting-screen.html"]'
    );
    var content = link.import;
    var el = content.querySelector('#loading');

    document.body.appendChild(el.cloneNode(true));
  },
  hide: function ws_hide() {
    document.body.removeChild(document.querySelector('#loading'));
  }
};
