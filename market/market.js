/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function() {
  
  window.addEventListener('load', function() {
    var navBar = document.getElementById('navBar');
    var rootView = document.getElementById('rootView');
    
    window.navController = new Gaia.UI.NavController(navBar, rootView);
    
    var xhr;
    
    if (!window['XMLHttpRequest'])
      return;
    
    xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function(evt) {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          var appsData = JSON.parse(xhr.responseText);
          renderAppsTableView(appsData);
        } else {
          alert('An error has occurred retrieving the app data: ' + xhr.status);
        }
      }
    };
    
    //xhr.open('GET', 'https://apps.mozillalabs.com/appdir/db/apps.json');
    xhr.open('GET', 'db/apps.json');
    xhr.send();
  });
  
  var renderAppsTableView = function(appsData) {
    var appsTableView = document.getElementById('appsTableView');
    var detailView = document.getElementById('detailView');
    var detailIcon = document.getElementById('detailIcon');
    var detailName = document.getElementById('detailName');
    var detailDescription = document.getElementById('detailDescription');
    
    appsData.forEach(function(app) {
      var cell = document.createElement('li');
      var drillDownCell = document.createElement('a');
      var icon = document.createElement('img');
      var title = document.createElement('h1');
      
      drillDownCell.className = 'drillDownCell';
      drillDownCell.href = '#detailView';
      drillDownCell.app = app;
      
      drillDownCell.addEventListener('click', function(evt) {
        var app = this.app;
        
        detailView.setAttribute('data-title', app.manifest.name);
        detailIcon.setAttribute('src', app.origin + app.manifest.icons['128']);
        detailName.innerHTML = app.manifest.name;
        detailDescription.innerHTML = app.manifest.description;
      });
      
      icon.src = app.origin + app.manifest.icons['128'];
      title.innerHTML = app.manifest.name;
      
      cell.appendChild(drillDownCell);
      drillDownCell.appendChild(icon);
      drillDownCell.appendChild(title);
      appsTableView.appendChild(cell);
    });
  };
  
})();
