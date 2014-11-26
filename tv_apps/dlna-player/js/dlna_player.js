/* globals ConnectionServiceManager, ContentDirectoryManager, AVTManager,
   DeviceManager, RenderCtrlManager */
'use strict';

function DlnaPlayer() {
  window.connectionServiceManager = new ConnectionServiceManager().init();
  ContentDirectoryManager.init();
  window.avtManager = new AVTManager().init();
  window.deviceManager = new DeviceManager().init();
}

window.dlnaPlayer = new DlnaPlayer();
