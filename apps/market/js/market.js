/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function() {
  window.addEventListener('load', function() {
    var xhr = new XMLHttpRequest();
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
    
    // TODO: Fetch from a live data source such as: https://apps.mozillalabs.com/appdir/db/apps.json
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
    
    // TODO: Wire up to navigator.mozApps API
    installButton.addEventListener('click', function(evt) {
      var app = this.app;
      evt.preventDefault();
    });
    
    // TODO: Wire up to navigator.mozApps API
    uninstallButton.addEventListener('click', function(evt) {
      var app = this.app;
      evt.preventDefault();
    });
    
    appsTableView.addEventListener('click', function(evt) {
      var target = evt.target;
      
      if (!(target instanceof HTMLAnchorElement))
        target = target.parentNode;
      
      if (!('app' in target))
        return;
      
      var app = target.app;
      
      detailView.dataset.title = app.manifest.name;
      detailView.src = app.origin + app.manifest.icons['128'];
      detailName.innerHTML = app.manifest.name;
      detailDescription.innerHTML = app.manifest.description;
      
      installButton.classList.remove('hide');
      uninstallButton.classList.add('hide');
      installButton.app = app;
      
      evt.preventDefault();
    });
    
    appsData.forEach(function(app) {
      var drillDownCell = document.createElement('a');
      drillDownCell.className = 'push slideHorizontal';
      drillDownCell.href = '#detailView';
      drillDownCell.app = app;
      
      var icon = document.createElement('img');
      icon.src = app.origin + app.manifest.icons['128'];
      
      var title = document.createElement('h1');
      title.innerHTML = app.manifest.name;
      
      var arrow = document.createElement('span');
      arrow.className = 'arrowRight';
      
      var cell = document.createElement('li');
      cell.appendChild(drillDownCell);
      
      drillDownCell.appendChild(icon);
      drillDownCell.appendChild(title);
      drillDownCell.appendChild(arrow);
      
      appsTableView.appendChild(cell);
    });
  };
})();

