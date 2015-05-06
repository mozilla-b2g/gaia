'use strict';

(function(exports) {

  var DevToolsAuthDialog = function DevToolsAuthDialog(options) {
    window.SystemDialog.call(this, options);
  };

  DevToolsAuthDialog.prototype = Object.create(window.SystemDialog.prototype);

  DevToolsAuthDialog.prototype.customID = 'devtools-auth-dialog';

  DevToolsAuthDialog.prototype.DEBUG = false;

  DevToolsAuthDialog.prototype.view = function() {
    return '<div id="' + this.instanceID + '" role="dialog" ' +
                'class="generic-dialog"' +
                'data-z-index-level="devtools-auth-dialog" hidden>' +
             '<div class="container">' +
               '<header data-l10n-id="devtools-auth-scan2"></header>' +
               '<div class="video-container">' +
                 '<video></video>' +
               '</div>' +
               '<menu data-items="1">' +
                 '<button data-l10n-id="cancel" type="cancel"></button>' +
               '</menu>' +
             '</div>' +
           '</div>';
  };

  // Get all elements when inited.
  DevToolsAuthDialog.prototype._fetchElements = function() {
    this.video =
      document.querySelector('#devtools-auth-dialog video');
    this.videoContainer =
      document.querySelector('#devtools-auth-dialog .video-container');
    this.buttonCancel =
      document.querySelector('#devtools-auth-dialog button[type="cancel"]');
  };

  // Register events when all elements are got.
  DevToolsAuthDialog.prototype._registerEvents = function() {
    this.buttonCancel.onclick = this.cancelHandler.bind(this);
  };

  DevToolsAuthDialog.prototype.cancelHandler = function() {
    this.hide('cancel');
    return true;
  };

  exports.DevToolsAuthDialog = DevToolsAuthDialog;

}(window));
