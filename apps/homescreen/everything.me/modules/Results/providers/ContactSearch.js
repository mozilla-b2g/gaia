Evme.ContactResult = function Evme_ContactResult(contactId) {
  var self = this;

  Evme.Result.call(this);
  this.type = Evme.RESULT_TYPE.CONTACT;

  // @override
  this.launch = function launchContactResult() {
    EvmeManager.openContact({"id": contactId});
  };
};
Evme.ContactResult.prototype = Object.create(Evme.Result.prototype);
Evme.ContactResult.prototype.constructor = Evme.ContactResult;

Evme.ContactResultsRenderer = function Evme_ContactResultsRenderer() {
  var NAME = "ContactResultsRenderer",
    self = this,
    containerEl,

    searchOptions = {
      filterBy: ["givenName"],
      filterOp: "contains",
      filterValue: "NOT_SET",
      filterLimit: 2
    };

  this.init = function init(cfg) {
    containerEl = cfg.containerEl;
  };

  this.render = function render(data) {
    self.clear();

    searchOptions.filterValue = data.query;

    var request = navigator.mozContacts.find(searchOptions);

    request.onsuccess = function(e) {
      var contacts = e.target.result;
      if (contacts && contacts.length) {
        renderDocFrag(contacts);
      }
    };
  };

  this.clear = function clear() {
    containerEl.innerHTML = '';
  };

  this.getResultCount = function getResultCount() {
    return containerEl.childElementCount;
  };

  function renderDocFrag(contacts) {
    var docFrag = document.createDocumentFragment();
    for (var i = 0, contact; contact = contacts[i++];) {
      var result = new Evme.ContactResult(contact.id),
        el = result.init({
          "name": contact.name[0]
        });

      result.draw(contact.photo[0] || Evme.DEFAULT_ICONS.CONTACT);
      docFrag.appendChild(el);
    }
    containerEl.appendChild(docFrag);
  }
};