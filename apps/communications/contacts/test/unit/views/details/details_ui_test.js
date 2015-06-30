/* global LazyLoader, DetailsUI, MockL10n, MockWebrtcClient */
/* global MockContactAllFields, ContactPhotoHelper, utils */

'use strict';

require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/js/lazy_loader.js');
require('/shared/elements/gaia_subheader/script.js');
require('/shared/elements/gaia-header/dist/gaia-header.js');

require('/shared/js/contacts/contacts_buttons.js');
require('/shared/js/text_normalizer.js');
require('/shared/js/contacts/utilities/dom.js');
require('/shared/js/contacts/import/utilities/misc.js');
require('/shared/js/contacts/utilities/templates.js');
require('/shared/js/contact_photo_helper.js');
requireApp('communications/contacts/js/activities.js');

require('/shared/test/unit/mocks/mock_contact_all_fields.js');
requireApp(
  'communications/contacts/test/unit/webrtc-client/mock_webrtc_client.js');

requireApp('communications/contacts/views/details/js/details_ui.js');

suite('DetailsUI', function() {

  var realMozL10n;
  var realWebrctClient;
  var mozContact = null;

  suiteSetup(function(done) {

    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realWebrctClient = window.WebrtcClient;
    window.WebrtcClient = MockWebrtcClient;
    // Load HTML
    loadBodyHTML('/contacts/views/details/details.html');

    // Add hook to template to "head"
    var importHook = document.createElement('link');
    importHook.setAttribute('rel', 'import');
    importHook.setAttribute('href', '/contacts/elements/details.html');
    document.head.appendChild(importHook);

    // Fill the HTML
    LazyLoader.load([document.getElementById('view-contact-details')],
      function() {
        mozContact = new MockContactAllFields();
        DetailsUI.init();
        DetailsUI.render(mozContact, 1, true);
        done();
    });

  });

  suiteTeardown(function() {
    document.body.innerHTML = '';
    navigator.mozL10n = realMozL10n;
    realMozL10n = null;
    window.WebrtcClient = realWebrctClient;
    realWebrctClient = null;
    mozContact = null;
  });

  setup(function() {
  });

  teardown(function() {
  });

  suite('Close button', function() {
    test(' > must dispatch an event when clicked', function(done) {
      window.addEventListener('backAction', function() {
        done();
      });

      var clickEvent = new CustomEvent('action');
      document.querySelector('#details-view-header').dispatchEvent(clickEvent);
    });
  });

  suite('Favorite', function() {
    test(' > header must be rendered with the favorite icon', function() {
      var header = document.querySelector('#details-view-header');
      assert.isTrue(header.classList.contains('favorite'));
    });

    test(' > toggle favorite button must display Remove string', function() {
      var toggleFavoriteBtn = document.querySelector('#toggle-favorite');
      assert.equal(toggleFavoriteBtn.getAttribute('data-l10n-id'),
        'removeFavorite');
    });

    test(' > click toggle favorite button must dispatch an event',
      function(done) {
        window.addEventListener('toggleFavoriteAction', function(evt) {
          assert.equal(evt.detail.contact, mozContact);
          assert.isTrue(evt.detail.isFavorite);
          done();
        });

        var toggleFavoriteBtn = document.querySelector('#toggle-favorite');
        toggleFavoriteBtn.click();
    });

    test(' > favorite state must change when an event is received',
      function(done) {
        var nonFavoriteContact = new MockContactAllFields();
        nonFavoriteContact.category = [];

        window.addEventListener('toggleFavoriteDone', function(evt) {
          assert.equal(evt.detail.contact, nonFavoriteContact);
          var toggleFavoriteBtn = document.querySelector('#toggle-favorite');
          assert.equal(toggleFavoriteBtn.getAttribute('data-l10n-id'),
            'addFavorite');
          var header = document.querySelector('#details-view-header');
          assert.isFalse(header.classList.contains('favorite'));
          done();
        });

        window.dispatchEvent(new CustomEvent('toggleFavoriteDone', {'detail':
          {'contact': nonFavoriteContact}}));
    });
  });

  suite('Org', function() {
    var orgTitle;
    setup(function() {
      orgTitle = document.querySelector('#org-title');
    });

    teardown(function() {
      orgTitle = null;
    });

    test(' > Contact has Org -> must be display properly', function() {
      assert.equal(orgTitle.textContent, mozContact.org[0]);
      assert.isFalse(orgTitle.classList.contains('hide'));
    });

    test(' > Contact hasnt Org -> must not be displayed', function() {
      var nonOrgContact = new MockContactAllFields();
      nonOrgContact.org = [];
      DetailsUI.renderOrg(nonOrgContact);
      assert.equal(orgTitle.textContent, '');
      assert.isTrue(orgTitle.classList.contains('hide'));
    });
  });

  suite('Phones', function() {
    test(' > Phones must be rendered properly', function() {
      var phones = document.querySelectorAll('div[data-tel]');
      assert.equal(phones.length, mozContact.tel.length);
      Array.prototype.forEach.call(phones, (phone, index) => {
        assert.equal(phone.dataset.tel, mozContact.tel[index].value);
      });
    });
  });

  suite('Emails', function() {
    test(' > Emails must be rendered properly', function() {
      var emails =
        document.querySelectorAll('li[data-mail]:not([data-template])');

      assert.equal(emails.length, mozContact.email.length);
      Array.prototype.forEach.call(emails, (listItem, index) => {
        var h2 = listItem.querySelector('h2');
        var button = listItem.querySelector('button[data-email]');

        assert.equal(h2.getAttribute('data-l10n-id'),
          mozContact.email[index].type[0]);
        assert.equal(button.dataset.email, mozContact.email[index].value);
      });
    });
  });

  suite('WebrtcClient', function() {
    test(' > start method must be called', function() {
      var spy = this.sinon.spy(window.WebrtcClient, 'start');
      var stub = this.sinon.stub(LazyLoader, 'load', function(files) {
        return {
          then: function(cb) {
            cb();
          }
        };
      });
      // Force renderWebrtcClient
      DetailsUI.renderWebrtcClient();
      assert.isTrue(spy.called);
      var call = stub.getCall(0);
      assert.isTrue(Array.isArray(call.args[0]));
      assert.equal(call.args[0][0],
        '/contacts/style/webrtc-client/webrtc_client.css');
      assert.equal(call.args[0][1],
        '/contacts/js/webrtc-client/webrtc_client.js');
    });
  });

  suite('Addresses', function() {
    test(' > Addresses must be rendered properly', function() {
      var addresses =
        document.querySelectorAll('li[data-address]:not([data-template])');

      assert.equal(addresses.length, mozContact.adr.length);
      Array.prototype.forEach.call(addresses, (listItem, index) => {
        var h2 = listItem.querySelector('h2');
        var a = listItem.querySelector('a');
        var address = a.textContent;

        assert.equal(h2.getAttribute('data-l10n-id'),
          mozContact.adr[index].type[0]);

        // Assert all data is displayed properly
        ['Germany', 'Chemnitz',
        'Chemnitz', '09034',
        'Gotthardstrasse 22'].forEach(needle => {
          assert.isTrue(address.includes(needle));
        });
      });
    });
  });

  suite('Dates', function() {
    test(' > Dates must be rendered properly', function() {
      var dates =
        document.querySelectorAll('li[aria-label="Date"]:not([data-template])');

      assert.equal(dates.length, 1);

      var h2 = dates[0].querySelector('h2');
      var strong = dates[0].querySelector('strong');
      var formatDate = utils.misc.formatDate(mozContact.bday);

      assert.equal(h2.textContent, 'birthday');
      assert.equal(strong.textContent, formatDate);
    });
  });

  suite('Notes', function() {
    test(' > Notes must be rendered properly', function() {
      var notes =
        document.querySelectorAll('p[data-comment]:not([data-template])');

      assert.equal(notes.length, mozContact.note.length);

      Array.prototype.forEach.call(notes, (item, index) => {
        assert.equal(item.textContent, mozContact.note[index]);
      });
    });
  });

  suite('Share button', function() {
    var selector;

    setup(function() {
      selector = 'li[data-social]:not([data-template])';
    });

    teardown(function() {
      selector = null;
    });

    test(' > Share button must be rendered properly', function() {
      var shareBtn = document.querySelector(selector + ' #share_button');
      assert.isFalse(shareBtn.classList.contains('hide'));
    });

    test(' > Share button must dispatch an event', function(done) {
      window.addEventListener('shareAction', function() {
        done();
      });

      var shareBtn = document.querySelector(selector + ' #share_button');
      shareBtn.click();
    });
  });

  suite('Find duplicates', function() {
    var selector;
    var realIsFavoriteChange;

    setup(function() {
      selector = 'li.duplicate-actions:not([data-template])';
      realIsFavoriteChange = DetailsUI.isAFavoriteChange;
      DetailsUI.isAFavoriteChange = false;
    });

    teardown(function() {
      selector = null;
      DetailsUI.isAFavoriteChange = realIsFavoriteChange;
    });

    test(' > Find duplicates buttons must be disabled', function() {
      var findMergeButton =
        document.querySelector(selector + ' #find-merge-button');
      assert.isTrue(findMergeButton.disabled);
    });

    test(' > Find duplicates buttons must send and event when clicked',
      function(done) {
        window.addEventListener('findDuplicatesAction', function() {
          done();
        });

        DetailsUI.render(mozContact, 2, true);

        var findMergeButton =
          document.querySelector(selector + ' #find-merge-button');
        assert.isFalse(findMergeButton.disabled);
        findMergeButton.click();
    });
  });

  suite('Photo', function() {
    test(' > Photo must be rendered properly', function() {
      var photo = ContactPhotoHelper.getFullResolution(mozContact);
      DetailsUI.calculateHash(photo, hash => {
        var cover = document.querySelector('#cover-img');
        assert.equal(cover.dataset.imgHash, hash);
      });
    });
  });
});
