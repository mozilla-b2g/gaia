var NfcSendDemo = {
  tagContainer: null,

  init: function nd_init() {
    dump('NfcSendDemo init');
    var content = document.getElementById('content');
    var globalMsg = document.getElementById('global-message');
    this.tagContainer = content.querySelector('[data-type="tag-container"]')

    var nfc = window.navigator.mozNfc;
    if (!nfc) {
      globalMsg.textContent = 'NFC API not available.';
      return;
    }

    if (!nfc.enabled) {
      globalMsg.textContent = 'NFC is not enabled.';
      return;
    }

    document.getElementById('global-message').textContent = '';

    nfc.onpeerfound = this.handlePeerFound.bind(this);
  },

  handlePeerFound: function nd_handlePeerFound(event) {
    var peer = event.peer;
    var result = this.tagContainer.querySelector('[data-type="send-result"]');
    var ndefHelper = new NDEFHelper();
    var url = document.getElementById('urlOptions');
    var record = ndefHelper.createURI(url[url.selectedIndex].value);

    peer.sendNDEF([record]).then(() => {
      result.style.color = "Green";
      result.textContent = "Pass";
    }).catch((err) => {
      result.style.color = "Red";
      result.textContent = err;
    });
    return false;
  },
};

window.addEventListener('load', () => NfcSendDemo.init());
