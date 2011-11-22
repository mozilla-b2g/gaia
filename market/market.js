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
          initTableView(appsData);
        } else {
          alert('An error has occurred retrieving the app data: ' + xhr.status);
        }
      }
    };
    
    //xhr.open('GET', 'https://apps.mozillalabs.com/appdir/db/apps.json');
    xhr.open('GET', 'db/apps.json');
    xhr.send();
  });
  
  var initTableView = function(appsData) {
    var appsTableView = document.getElementById('appsTableView');
    var detailView = document.getElementById('detailView');
    var detailIcon = document.getElementById('detailIcon');
    var detailName = document.getElementById('detailName');
    var detailDescription = document.getElementById('detailDescription');
    var installButton = document.getElementById('installButton');
    var uninstallButton = document.getElementById('uninstallButton');
    
    installButton.addEventListener('click', function(evt) {
      var app = this.app;
      evt.preventDefault();
    });
    
    uninstallButton.addEventListener('click', function(evt) {
      var app = this.app;
      evt.preventDefault();
    });
    
    appsTableView.addEventListener('click', function(evt) {
      var target = evt.target;
      var targetNodeName = target.nodeName.toLowerCase();
      var app;
      
      if (targetNodeName === 'a') {
        app = target.app;
      } else {
        target = target.parentNode;
        targetNodeName = target.nodeName.toLowerCase();
        
        if (targetNodeName === 'a') {
          app = target.app;
        } else {
          return;
        }
      }
      
      detailView.setAttribute('data-title', app.manifest.name);
      detailIcon.setAttribute('src', app.origin + app.manifest.icons['128']);
      detailName.innerHTML = app.manifest.name;
      detailDescription.innerHTML = app.manifest.description;
      
      if (Gaia.AppManager.getInstalledAppForURL(app.src_url)) {
        installButton.style.display = 'none';
        uninstallButton.style.display = 'inline-block';
        uninstallButton.app = app;
      } else {
        installButton.style.display = 'inline-block';
        uninstallButton.style.display = 'none';
        installButton.app = app;
      }
      
      evt.preventDefault();
    });
    
    appsData.forEach(function(app) {
      var cell = document.createElement('li');
      var drillDownCell = document.createElement('a');
      var icon = document.createElement('img');
      var title = document.createElement('h1');
      var arrow = document.createElement('span');
      
      drillDownCell.className = 'drillDownCell';
      drillDownCell.href = '#detailView';
      drillDownCell.app = app;
      
      icon.src = app.origin + app.manifest.icons['128'];
      title.innerHTML = app.manifest.name;
      arrow.className = 'arrowRight';
      
      cell.appendChild(drillDownCell);
      drillDownCell.appendChild(icon);
      drillDownCell.appendChild(title);
      drillDownCell.appendChild(arrow);
      
      if (Gaia.AppManager.getInstalledAppForURL(app.src_url)) {
        var installedBadge = document.createElement('span');
        
        installedBadge.className = 'badge';
        installedBadge.innerHTML = 'Installed';
        
        drillDownCell.appendChild(installedBadge);
      }
      
      appsTableView.appendChild(cell);
    });
  };
  
})();
