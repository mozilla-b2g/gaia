var NfcTechDemo = {
  init: function nd_init() {
    dump('NfcTechDemo init');
    var content = document.getElementById('content');
    var errorMsg = document.getElementById('error-message');

    var nfc = window.navigator.mozNfc;
    if (!nfc) {
      errorMsg.textContent = 'NFC API not available.';
      return;
    }

    if (!nfc.enabled) {
      errorMsg.textContent = 'NFC is not enabled.';
      return;
    }

    document.getElementById('isoDep-container').hidden = true;

    nfc.ontagfound = this.handleTagFound.bind(this);
    nfc.ontaglost = this.handleTagLost.bind(this);
  },

  handleTagFound: function nd_handleTagFound(event) {
    // clear success/error message.
    var errorMsg = document.getElementById('error-message');
    errorMsg.textContent = '';
    var sucMsg = document.getElementById('success-message');
    sucMsg.textContent = '';
    document.getElementById('isoDep-container').hidden = true;

    var tag = event.tag;
    var tagContainer = document.getElementById('tag-container');
    var techList = tagContainer.querySelector('[data-type="tech-list"]');
    techList.textContent = tag.techList || 'null';

    if (tag.techList.indexOf('ISO-DEP') != -1) {
      this.processIsoDep(tag);
      sucMsg.textContent = 'transceive succeeds.';
    }

    return false;
  },

  handleTagLost: function nd_handleTagLost() {
  },

  processIsoDep: function nd_processIsoDep(tag) {
    var container = document.getElementById('isoDep-container');
    container.hidden = false;
    var isoDep = tag.selectTech('ISO-DEP');
    this.getVersion(isoDep, container).then(
      () => { return this.getKeyInfo(isoDep, container); });
  },

  getVersion: function nd_getVersion(isoDep, container) {
    var ndefHelper = new NDEFHelper();
    return new Promise((resolve, reject) => {
      isoDep.transceive(new Uint8Array([0x90, 0x60, 0x00, 0x00, 0x00])).
        then(response => {
          container.querySelector('[data-type="hw-vendor-id"]').textContent =
            response[0].toString(16);
          container.querySelector('[data-type="hw-type"]').textContent =
            response[1].toString(16) + '.' + response[2].toString(16);
          container.querySelector('[data-type="hw-version"]').textContent =
            response[3].toString(16) + '.' + response[4].toString(16);
          container.querySelector('[data-type="hw-storage"]').textContent =
            1 << (response[5] >> 1);
          container.querySelector('[data-type="hw-protocol"]').textContent =
            response[6].toString(16);
          // Assuming the status code is 0x91, 0xaf,
          // sending 0xaf to get additional info.
          return isoDep.transceive(new Uint8Array([0x90, 0xaf, 0x00, 0x00, 0x00])); }).
        then(response => {
          container.querySelector('[data-type="sw-vendor-id"]').textContent =
            response[0].toString(16);
          container.querySelector('[data-type="sw-type"]').textContent =
            response[1].toString(16) + '.' + response[2].toString(16);
          container.querySelector('[data-type="sw-version"]').textContent =
            response[3].toString(16) + '.' + response[4].toString(16);
          container.querySelector('[data-type="sw-storage"]').textContent =
            1 << (response[5] >> 1);
          container.querySelector('[data-type="sw-protocol"]').textContent =
            response[6].toString(16);
          // Assuming the status code is 0x91, 0xaf,
          // sending 0xaf to get additional info.
          return isoDep.transceive(new Uint8Array([0x90, 0xaf, 0x00, 0x00, 0x00])); }).
        then(response => {
          // Assuming it uses 7 bytes UID, if a random ID is used, it will be of
          // 4 bytes.
          container.querySelector('[data-type="uid"]').textContent =
            ndefHelper.dumpUint8Array(response.subarray(0, 7));
          container.querySelector('[data-type="batch-num"]').textContent =
            ndefHelper.dumpUint8Array(response.subarray(7, 12));
          container.querySelector('[data-type="production-date"]').textContent =
            'Week ' + response[12].toString(16) + '/ 20' + response[13].toString(16);
          resolve();
        });
    });
  },

  getKeyInfo: function nd_getKeyInfo(isoDep, container) {
    return new Promise((resolve, reject) => {
      isoDep.transceive(new Uint8Array([0x90, 0x45, 0x00, 0x00, 0x00])).
        then(response => {
          container.querySelector('[data-type="key-settings"]').textContent =
            response[0].toString(16);
          container.querySelector('[data-type="max-keys"]').textContent =
            response[1].toString(16);
          return isoDep.transceive(new Uint8Array([0x90, 0x64, 0x00, 0x00, 0x01, 0x00, 0x00])); }).
        then(response => {
          container.querySelector('[data-type="key-version"]').textContent =
            response[0].toString(16);
          resolve();
        });
    });
  },
};
window.addEventListener('load', () => NfcTechDemo.init());
