var settingsTest = {
  init: function () {
    this.statusPlaceholder = document.getElementById('status-placeholder');
    this.statusContainer = document.getElementById('status-container');

    this.errorPlaceholder = document.getElementById('error-placeholder');
    this.errorContainer = document.getElementById('error-container');
  },
  addStatus: function (aStatus) {
    this.statusPlaceholder.innerHTML = this.statusPlaceholder.innerHTML + "<br\>" + aStatus;
  },
  onError: function(aError) {
    this.errorContainer.classList.remove('hidden');
    this.errorPlaceholder.textContent = aError;
  },
  runTest: function() {
    if (navigator.mozSettings)
    {    
      var lock = navigator.mozSettings.createLock();
      this.addStatus("Successfully created lock!");
      var req = lock.get("wallpaper.image");
      req.onsuccess = (() => {
        this.addStatus("Successfully retrieved wallpaper");
        var req2 = lock.set({"wallpaper.image": req.result["wallpaper.image"]});
        req2.onsuccess = (() => {
          this.addStatus("Successfully set wallpaper");
          var req3 = lock.get("wifi.enabled");
          req3.onsuccess = (() => {
            this.onError("ERROR: SHOULD NOT BE ABLE TO GET WIFI");
          });
          req3.onerror = (() => {
            this.addStatus("wifi.enabled request rejected as expected");
          });
        });
        req2.onerror = (() => {
          this.onError("COULD NOT SET WALLPAPER");
        });
      });
      req.onerror = (() => {
        this.onError("COULD NOT RETRIEVE WALLPAPER.")
      });
    }
    else {
      this.onError("SETTINGS API UNAVAILABLE");
    }
  }
}

window.addEventListener('DOMContentLoaded', function onload() {
  window.removeEventListener('DOMContentLoaded', onload);
  settingsTest.init();
  settingsTest.runTest();
});
