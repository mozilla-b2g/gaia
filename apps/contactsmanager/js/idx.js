'use strict';
/* jshint esnext:true */

var SearchIndex = (function _SearchIndex() {
  const NAME = 'Global_Contacts_Index_Search';

  /** Promise for the GCIS */
  var idsPromise =
    navigator.getDataStores(NAME).then(stores => stores[0]);

  /**
   * Adds a new contact ID by Store
   *
   * @param {string} owner ID of the application owning the datastore
   * @param {string} originDsId ID of the contact in the original datastore
   * @param {string} globalDsId ID of the contact in the GCDS
   *
   * @return {Promise}
   */
  function indexByStore(owner, originDsId, globalDsId) {
    idsPromise.then(indexSearchStore => {

    });

    // TODO: Investigate, do we need to index by original id, or just
    // keep an array of gcds ids by this store?
    let storeIndex = index.byStore[owner];
    if (!storeIndex) {
      storeIndex = {};
      index.byStore[owner] = storeIndex;
    }

    storeIndex[originDsId] = globalDsId;
  }

  /**
   *
   * @param {MozContact} contact
   */
  function indexByPhone(contact, idx) {
    let phones = contact.tel;
    if (!Array.isArray(phones)) {
      return;
    }

    phones.forEach(phone => {
      let variants = SimplePhoneMatcher.generateVariants(phone.value);

      variants.forEach(variant => index.byTel[variant] = idx);
      // To avoid the '+' char
      TelIndexer.index(index.treeTel, phone.value.substring(1), idx);
    });
  }

  return {
    get byStore(owner) { },
    get byTel(owner) { },
    removePhoneIndex,
    removeStoreIndex,
    clear
  };

})();
