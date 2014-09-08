'use strict';
/* global fb */
/* global MockAllFacebookContacts:true */
/* global MockasyncStorage */
/* global Mockfb */
/* global MockImageLoader */
/* global MockLinkedContacts:true */
/* global MockLinkHtml */
/* global MockOauthflow */
/* global MockCurtain */

require('/shared/js/text_normalizer.js');
require('/shared/js/binary_search.js');
require('/shared/js/contacts/import/utilities/misc.js');
require('/shared/js/contacts/utilities/dom.js');
require('/shared/js/contacts/utilities/templates.js');

requireApp('contacts/test/unit/mock_link.html.js');
requireApp('contacts/test/unit/mock_l10n.js');
requireApp('communications/facebook/test/unit/mock_curtain.js');
requireApp('contacts/test/unit/mock_utils.js');
requireApp('contacts/test/unit/mock_asyncstorage.js');
requireApp('contacts/test/unit/mock_linked_contacts.js');
requireApp('contacts/test/unit/mock_fb.js');
requireApp('contacts/test/unit/mock_oauthflow.js');
requireApp('contacts/js/fb/fb_link.js');

var realImageLoader,
    realAsyncStorage,
    realFb,
    realOauthflow,
    realCurtain,
    linkProposal,
    linkProposalChild;


if (!window.asyncStorage) {
  window.asyncStorage = null;
}

if (!window.ImageLoader) {
  window.ImageLoader = null;
}

if (!window.fb) {
  window.fb = null;
}

if (!window.oauthflow) {
  window.oauthflow = null;
}

suite('Link Friends Test Suite', function() {

  var spy;

  suiteSetup(function() {
    realImageLoader = window.ImageLoader;
    window.ImageLoader = MockImageLoader;

    realCurtain = window.Curtain;
    window.Curtain = MockCurtain;

    realAsyncStorage = window.asyncStorage;
    window.asyncStorage = MockasyncStorage;

    realFb = window.fb;
    window.fb = Mockfb;
    window.fb.link = realFb.link;

    realOauthflow = window.oauthflow;
    window.oauthflow = MockOauthflow;

    spy = sinon.spy(fb.utils, 'setCachedNumFriends').withArgs(
                                      MockAllFacebookContacts.data.length);

    document.body.innerHTML = MockLinkHtml;

    linkProposal = document.body.querySelector('#friends-list');

    linkProposalChild = linkProposal.firstElementChild;

    fb.link.init();
  });

  teardown(function() {
    spy.reset();
  });

  test('Link UI. Proposal Calculated', function(done) {
    linkProposal.innerHTML = '';
    linkProposal.appendChild(linkProposalChild);

    fb.utils.result = {
      givenName: ['Jose'],
      tel: [{
        type: ['home'],
        value: '678956345'
      }]
    };

    fb.link.start('mock_token', '123456', function() {
      // As the template itself also counts
      assert.equal(document.querySelectorAll('#friends-list li').length, 3);

      // Here we check for the UIDs of the MockLinkedContacts
      // which are defined on the mock_linked_contacts.js source
      assert.isNotNull(document.
                       querySelector('li[data-uuid="1xz"]'));
      assert.isNotNull(document.
                       querySelector('li[data-uuid="2abc"]'));

      // Check that the total number of friends is properly cached (bug 838605)
      assert.isTrue(spy.calledOnce);

      done();
    });
  });


  test('Link UI. No proposals. Showing All', function(done) {
    linkProposal.innerHTML = '';
    linkProposal.appendChild(linkProposalChild);

    var oldMockLinkedContacts = MockLinkedContacts;

    MockLinkedContacts = {
      data: []
    };

    fb.link.start('mock_token', '123456', function() {
      // As the template itself also counts
      assert.equal(document.querySelectorAll('#friends-list li').length, 5);

      // Here we check for the UIDs of the MockAllFacebookContacts
      // which are defined on the mock_linked_contacts.js source
      assert.isNotNull(document.
                       querySelector('li[data-uuid="5678x"]'));
      assert.isNotNull(document.
                       querySelector('li[data-uuid="56zwt"]'));
      assert.isNotNull(document.
                       querySelector('li[data-uuid="kjh2389"]'));
       assert.isNotNull(document.
                       querySelector('li[data-uuid="aa45bb"]'));

      MockLinkedContacts = oldMockLinkedContacts;

      // Check that the total number of friends is properly cached (bug 838605)
      assert.isTrue(spy.calledOnce);

      done();
    });
  });


  test('Link UI. Matching by givenName >accents in proposal', function(done) {
    linkProposal.innerHTML = '';
    linkProposal.appendChild(linkProposalChild);

    fb.utils.result = {
      givenName: ['Angela']
    };

    fb.link.start('mock_token', '123456', function() {
      // As the template itself also counts
      assert.equal(document.querySelectorAll('#friends-list li').length, 2);

      // Here we check for the id of the MockLinkedContact whose first_name
      // is 'Ángela'
      assert.isNotNull(document.
                       querySelector('li[data-uuid="kjh2389"]'));

      done();
     });
  });


  test('Link UI. Matching by givenName >accents in local data', function(done) {
    linkProposal.innerHTML = '';
    linkProposal.appendChild(linkProposalChild);

    var oldMockAllFacebookContacts = MockAllFacebookContacts;

    MockAllFacebookContacts.data[2].name = 'Angela Cuts';
    MockAllFacebookContacts.data[2].first_name = 'Angela';

    // To enable the accents match
    fb.utils.result = {
      givenName: ['Ángela']
    };

    fb.link.start('mock_token', '123456', function() {
      // As the template itself also counts
      assert.equal(document.querySelectorAll('#friends-list li').length, 2);

      // Here we check for the id of the MockLinkedContact whose first_name
      // is 'Angela'
      assert.isNotNull(document.
                       querySelector('li[data-uuid="kjh2389"]'));

      MockAllFacebookContacts = oldMockAllFacebookContacts;

      done();
     });
  });

  test('Link UI. Matching by familyName > accents in both', function(done) {
    linkProposal.innerHTML = '';
    linkProposal.appendChild(linkProposalChild);

    fb.utils.result = {
      familyName: ['González']
    };

    fb.link.start('mock_token', '123456', function() {
      // As the template itself also counts
      assert.equal(document.querySelectorAll('#friends-list li').length, 2);

      // Here we check for the id of the MockLinkedContact whose lasr_name
      // is 'González'
      assert.isNotNull(document.
                       querySelector('li[data-uuid="aa45bb"]'));

      done();
    });
  });

  suite('Link UI process', function() {
    test('Link UI process ends as expected', function(done) {
      linkProposal.innerHTML = '';
      linkProposal.appendChild(linkProposalChild);

      sinon.stub(window.Curtain, 'hide', function(callback) {
        if (typeof callback === 'function') {
          callback();
        }
      });

      sinon.stub(window.parent, 'postMessage', function(msg) {
        done(function() {
          window.Curtain.hide.restore();
          window.parent.postMessage.restore();
          assert.equal(msg.type, 'ready', 'Sent message is of type \'ready\'.');
        });
      });

      fb.link.start('mock_token', '123456');
    });
  });

  suiteTeardown(function() {
    window.ImageLoader = realImageLoader;
    window.asyncStorage = realAsyncStorage;
    window.fb = realFb;
    window.oauthflow = realOauthflow;
    window.Curtain = realCurtain;
  });

});
