var NfcReadDemo = {
  tagContainer: null,
  ndefMsgContainer: null,

  tag: null,

  init: function nd_init() {
    dump('NfcReadDemo init');
    var content = document.getElementById('content');
    var errorMsg = document.getElementById('error-message');
    this.tagContainer = document.getElementById('tag-container');
    this.ndefMsgContainer = document.getElementById('ndef-msg-container');
    this.ndefMsgContainer.hidden = true;

    var nfc = window.navigator.mozNfc;
    if (!nfc) {
      errorMsg.textContent = 'NFC API not available.';
      return;
    }

    if (!nfc.enabled) {
      errorMsg.textContent = 'NFC is not enabled.';
      return;
    }

    document.getElementById('error-message').textContent = '';

    nfc.ontagfound = this.handleTagFound.bind(this);
    nfc.ontaglost = this.handleTagLost.bind(this);
  },

  handleTagFound: function nd_handleTagFound(event) {
    // clear success/error message.
    var errorMsg = document.getElementById('error-message');
    errorMsg.textContent = '';
    var sucMsg = document.getElementById('success-message');
    sucMsg.textContent = '';

    this.tag = event.tag;

    var tag = event.tag;
    var techList = this.tagContainer.querySelector('[data-type="tech-list"]');
    var tagId = this.tagContainer.querySelector('[data-type="tag-id"]');
    var tagType = this.tagContainer.querySelector('[data-type="tag-type"]');
    var maxNDEFSize = this.tagContainer.
      querySelector('[data-type="max-ndef-size"]');
    var readOnly = this.tagContainer.querySelector('[data-type="read-only"]');
    var formatable = this.tagContainer.
      querySelector('[data-type="formatable"]');
    var canReadOnly =
      this.tagContainer.querySelector('[data-type="can-be-made-read-only"]');
    var isLost = this.tagContainer.querySelector('[data-type="is-lost"]');

    var ndefHelper = new NDEFHelper();
    techList.textContent = tag.techList || 'null';
    tagId.textContent = ndefHelper.dumpUint8Array(tag.id);
    tagType.textContent = tag.type || 'null';
    maxNDEFSize.textContent = tag.maxNDEFSize || 'null';
    readOnly.textContent = tag.isReadOnly != null ?
                             tag.isReadOnly : 'null';
    formatable.textContent = tag.isFormatable != null ?
                               tag.isFormatable : 'null';
    canReadOnly.textContent = tag.canBeMadeReadOnly != null ?
                                tag.canBeMadeReadOnly : 'null';
    isLost.textContent = tag.isLost;

    var ndefRecords = event.ndefRecords;
    var ndefLen = ndefRecords ? ndefRecords.length : 0;

    // clear previous ndef information
    var recordCount = this.ndefMsgContainer.
      querySelector('[data-type="record-count"]');
    var previousCount = recordCount.textContent;
    var i;
    for (i = 0; i < previousCount; i++) {
      var ndefContainer = document.getElementById("ndef#" + i);
      if (ndefContainer) {
        this.ndefMsgContainer.removeChild(ndefContainer);
      }
    }

    // if no NDEF Records are contained, bail out.
    if (!ndefLen) {
      this.ndefMsgContainer.hidden = true;
      return true;
    }

    this.showNDEFRecords(event.ndefRecords);

    tag.readNDEF().then(
      function (ndefRecords) {
        this.compareRecords(ndefRecords, event.ndefRecords);
      }.bind(this),
      error => {
        errorMsg.textContent = 'readNDEF failed, ' + error;
      });

    return false;
  },

  handleTagLost: function nd_handleTagLost() {
    // update tag.isLost field.
    var tag = this.tag;
    var isLost = this.tagContainer.querySelector('[data-type="is-lost"]');
    isLost.textContent = tag.isLost;
  },

  compareRecords: function nd_compareRecords(recordsA, recordsB) {
    var errorMsg = document.getElementById('error-message');

    if (recordsA.length != recordsB.length) {
      errorMsg.textContent = 'Number of Records are different.';
      return;
    }

    var identical = true;
    for (var i = 0; i < recordsA.length; i++) {
      var A = recordsA[i];
      var B = recordsB[i];

      var props = ['tnf', 'type', 'id', 'payload'];
      for (var prop of props) {
        if (A.prop != B.prop) {
          identical = false;
          errorMsg.textContent = prop + ' mismatched in the ' + i + 'th record';
          break;
        }
      }
    }

    if (identical) {
      var sucMsg = document.getElementById('success-message');
      sucMsg.textContent = 'readNDEF succeeds.';
    }
  },

  showNDEFRecords: function nd_showNDEFRecords(ndefRecords) {
    var ndefLen = ndefRecords.length;
    var recordCount = this.ndefMsgContainer.
      querySelector('[data-type="record-count"]');
    recordCount.textContent = ndefLen;
    var ndefTemplate = document.getElementById("ndef-template");
    ndefTemplate.hidden = true;

    var ndefHelper = new NDEFHelper();
    for (i = 0; i < ndefLen; i++) {
      var ndefContainer = document.getElementById("ndef#" + i);
      if (!ndefContainer) {
        ndefContainer = ndefTemplate.cloneNode(true);
        ndefContainer.id = 'ndef#' + i;

        var tnf = ndefContainer.querySelector('[data-type="ndef-tnf"]');
        tnf.textContent = ndefRecords[i].tnf;

        var type = ndefContainer.querySelector('[data-type="ndef-type"]');
        type.textContent = ndefHelper.dumpUint8Array(ndefRecords[i].type);

        var id = ndefContainer.querySelector('[data-type="ndef-id"]');
        id.textContent = ndefHelper.dumpUint8Array(ndefRecords[i].id);

        var payload = ndefContainer.querySelector('[data-type="ndef-payload"]');
        payload.textContent = ndefHelper.dumpUint8Array(ndefRecords[i].payload);

        ndefContainer.hidden = false;
        this.ndefMsgContainer.appendChild(ndefContainer);
      }
    }

    this.ndefMsgContainer.hidden = false;
  }
};

window.addEventListener('load', () => NfcReadDemo.init());
