"use strict";


//////////////////////////////////////////////////////////////////////////////
// This exist so I don't have to keep remembering how to do it...
//////////////////////////////////////////////////////////////////////////////
function addText(elem,text) {
    elem.appendChild(document.createTextNode(text));
}

function createElementAt(mainBody,type,id,optionalText,before) {
    var elem=document.createElement(type);
    elem.setAttribute("id",id);
    if (!before) {
        mainBody.appendChild(elem);
    } else {
        mainBody.insertBefore(elem,before);
    }
    if (optionalText) {
        addText(elem,optionalText);
    }
    return elem;
}
//////////////////////////////////////////////////////////////////////////////
// End of useful DOM manipulation...
//////////////////////////////////////////////////////////////////////////////

function testPermissions(outputElement) {
  var _permissions = [
    'power', 'sms', 'contacts', 'telephony', 'browser',
    'mozApps', 'mobileconnection', 'mozFM', 'systemXHR', 'background',
    'backgroundservice', 'settings', 'alarm', 'camera', 'fmradio', 'voicemail',
    'wifi-manage', 'wifi', 'networkstats-manage', 'geolocation',
    'webapps-manage', 'permissions', 'desktop-notification',
    'device-storage:pictures', 'device-storage:music', 'device-storage:videos',
    'device-storage:apps', 'alarms', 'attention', 'content-camera',
    'tcp-socket', 'bluetooth', 'storage', 'time', 'networkstats-manager',
    'idle', 'network-events', 'embed-apps',
    // Just don't.
    'deprecated-hwvideo'
  ];
  
  var mozPerms = navigator.mozPermissionSettings;
  if (!mozPerms) {
    createElementAt(outputElement,"p","","I can't access mozPermissionSettings!");
    return;
  }

  navigator.mozApps.mgmt.getAll().onsuccess = function mozAppGotAll(evt) {
    var apps = evt.target.result;
  
    apps.sort(function alphabeticalSort(app, otherApp) {
      return app.manifest.name > otherApp.manifest.name;
    });


    // We display permissions declared in the manifest
    // and any other granted permission. I should see how forEach works some time.
    // Some OTHER time
    createElementAt(outputElement,"p","",
                    "List of application permissions below. "+
                    "Click on any permission to toggle its value.");
    createElementAt(outputElement,"p","", 
                    "NOTE: Trying to toggle a implicit permission"+
                    " should not work!");

    var ulApps=createElementAt(outputElement,"ul");
 
    for (var i=0; i<apps.length; i++) {
      var app=apps[i];
      var liApp=createElementAt(ulApps,"li");
      liApp.innerHTML="<b>"+app.manifest.name+"</b>";
      var ulPerm=createElementAt(ulApps,"ul");
      ulPerm.hidden=true;

      liApp.onclick=function () {
        arguments[0].hidden=!arguments[0].hidden;
      }.bind(undefined,ulPerm);

      for (var j=0; j<_permissions.length; j++) {
        var perm=_permissions[j];
        var value = mozPerms.get(perm, app.manifestURL, app.origin, false);
        if (value !== "unknown") {
          var explicit = 
            mozPerms.isExplicit(perm, app.manifestURL, app.origin, false) ? 
            "/explicit" :"/implicit";  
          var printValue = value + explicit;
          var li=createElementAt(ulPerm,"li",app.manifest.name+":"+perm, 
                                 perm +": "+printValue); 
          li.onclick=function() {
            togglePermission(arguments[0], arguments[1], arguments[2]);
          }.bind(undefined, app, perm, li);
        }
      }
    }
  };
}

function togglePermission(app,perm,item) {

  var mozPerms = navigator.mozPermissionSettings;
  var value = mozPerms.get(perm, app.manifestURL, app.origin, false);

  console.log("Trying to change permission for "+app.manifest.name+
              " perm: "+perm+" Current Value: "+value);

  var newPerm="deny";
  switch ( value ) {
  case "deny":
    newPerm = "prompt";
    break;
  case "prompt":
    newPerm = "allow";
    break;
  }
  mozPerms.set(perm, newPerm, app.manifestURL, app.origin, false);

  // Nasty nasty suspicion
  setTimeout(function () {
    var newValue = mozPerms.get(perm, app.manifestURL, app.origin, false);
    var explicit = 
      mozPerms.isExplicit(perm, app.manifestURL, app.origin, false) ? 
      "/explicit" :"/implicit";  
    console.log("After changing permission for "+app.manifest.name+
                " perm: "+perm+" New Value: "+newValue+explicit);
    item.innerHTML=perm+": "+newValue+explicit;
  },1000);


}

window.onload=function () {
  var outputElement=document.getElementById("addContent");
  testPermissions(outputElement);
}

