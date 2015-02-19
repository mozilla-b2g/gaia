var NfcDispatchDemo = {
  tagContainer: null,

  init: function nd_init() {
    dump('NfcDispatchDemo init');
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

    nfc.ontagfound = this.handleTagFound.bind(this);
    nfc.onpeerfound = this.handlePeerFound.bind(this);
  },

  handleTagFound: function nd_handleTagFound(event) {
    var ndefRecords = event.ndefRecords;
    var tagUri =
      this.tagContainer.querySelector('[data-type="tag-uri"]');
    tagUri.textContent = '';
    var result =
      this.tagContainer.querySelector('[data-type="dispatch-result"]');

    var ndefHelper = new NDEFHelper();
    var ndef = Array.isArray(ndefRecords) && ndefRecords[0];
    var uri = ndefHelper.parseURI(ndef);
    tagUri.textContent = uri;
    if (uri.startsWith('https://www.mozilla.org')) {
      result.textContent = 'Default Prevented';
      return false;
    } else {
      result.textContent = 'Default Action Executed';
      return true;
    }
  },

  handlePeerFound: function nd_handlePeerFound(event) {
    var tagUri =
      this.tagContainer.querySelector('[data-type="tag-uri"]');
    tagUri.textContent = '';
    var result =
      this.tagContainer.querySelector('[data-type="dispatch-result"]');

    result.textContent = 'Default Prevented';
    event.preventDefault();
  }
};

window.addEventListener('load', () => NfcDispatchDemo.init());
