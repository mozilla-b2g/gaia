/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

//(function() {
  
  window.addEventListener('load', function() {
    var navBar = document.getElementById('navBar');
    var rootView = document.getElementById('rootView');
    
    window.navController = new Gaia.UI.NavController(navBar, rootView);
  });
  
//})();
