var NfcFormatDemo = {
  tagContainer: null,

  init: function nd_init() {
    dump('NfcFormatDemo init');
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
  },

  handleTagFound: function nd_handleTagFound(event) {
    var tag = event.tag;
    var formatable =
      this.tagContainer.querySelector('[data-type="formatable"]');
    formatable.textContent = tag.isFormatable != null ?
                               tag.isFormatable : 'null';

    var result = this.tagContainer.querySelector('[data-type="format-result"]');

    tag.format().then(() => {
      result.style.color = "Green";
      result.textContent = "Pass";
    }).catch((err) => {
      result.style.color = "Red";
      result.textContent = err;
    });

    return false;
  }
};

window.addEventListener('load', () => NfcFormatDemo.init());
