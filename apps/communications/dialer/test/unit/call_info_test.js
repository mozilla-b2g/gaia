'use strict';

/* globals CallInfo, CallLogDBManager, MocksHelper, Utils */

require('/dialer/test/unit/mock_call_log_db_manager.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_moz_activity.js');
require('/shared/test/unit/mocks/dialer/mock_utils.js');

require('/dialer/js/call_info.js');

var mocksHelperForCallInfoView = new MocksHelper([
  'CallLogDBManager',
  'LazyLoader',
  'MozActivity',
  'Utils'
]).init();

suite('Call Info', function(argument) {

  mocksHelperForCallInfoView.attachTestHelpers();

  var contactsIframe;
  suiteSetup(function() {
    loadBodyHTML('/dialer/elements/call-info-view.html');
    var section = document.createElement('section');
    section.setAttribute('is', 'call-info-view');
    section.setAttribute('role', 'region');
    section.id = 'call-info-view';
    section.hidden = true;
    section.innerHTML = document.body.querySelector('template').innerHTML;

    document.body.appendChild(section);

    contactsIframe = document.createElement('iframe');
    contactsIframe.id = 'iframe-contacts';
    document.body.appendChild(contactsIframe);
  });

  var groupReturn = {
    number: '12345',
    date: 1,
    type: 'incoming',
    // status
    calls: [

    ]
  };

  var fakeNumber = '12345';
  var fakeDate = '1';
  var fakeType = 'incoming';
  var fakeStatus = 'connected';
  setup(function() {
    this.sinon.stub(CallLogDBManager, 'getGroup').returns({
      then: function(callback) {
        callback(groupReturn);
      }
    });
  });

  suite('common', function() {
    setup(function() {
      this.sinon.stub(Utils, 'headerDate').returns('TADA !');
      CallInfo.show(fakeNumber, fakeDate, fakeType, fakeStatus);
    });

    test('displays the view', function() {
      assert.isFalse(document.getElementById('call-info-view').hidden);
    });

    test('looks up the right group', function() {
      sinon.assert.calledWith(CallLogDBManager.getGroup,
        fakeNumber, parseInt(fakeDate, 10), fakeType, fakeStatus);
    });

    test('taping the close button closes the view', function() {
      document.getElementById('call-info-close').click();
      assert.isTrue(document.getElementById('call-info-view').hidden);
    });

    test('', function() {
      assert.equal(document.getElementById('call-info-day').textContent,
                   'TADA !');
    });

    test('title', function() {
      var callInfoTitle = document.getElementById('call-info-title');
      assert.equal(callInfoTitle.textContent, fakeNumber);
    });

    suite('Number is voicemail', function() {
      setup(function() {
        groupReturn.voicemail = true;
        CallInfo.show(fakeNumber, fakeDate, fakeType, fakeStatus);
      });

      teardown(function() {
        groupReturn.voicemail = false;
        CallInfo.show(fakeNumber, fakeDate, fakeType, fakeStatus);
      });

      test('title', function() {
        var callInfoTitle = document.getElementById('call-info-title');
        assert.equal(callInfoTitle.getAttribute('data-l10n-id'), 'voiceMail');
      });
    });

    suite('Number is emergency', function() {
      setup(function() {
        groupReturn.emergency = true;
        CallInfo.show(fakeNumber, fakeDate, fakeType, fakeStatus);
      });

      teardown(function() {
        groupReturn.emergency = false;
        CallInfo.show(fakeNumber, fakeDate, fakeType, fakeStatus);
      });

      test('title', function() {
        var callInfoTitle = document.getElementById('call-info-title');
        assert.equal(callInfoTitle.getAttribute('data-l10n-id'),
                     'emergencyNumber');
      });
    });

    suite('Call direction', function() {
      var previousType;
      var previousStatus;
      var classList;

      setup(function() {
        previousType = groupReturn.type;
        previousStatus = groupReturn.status;
        classList = document.getElementById('call-info-direction').classList;
      });

      teardown(function() {
        groupReturn.type = previousType;
        groupReturn.status = previousStatus;
      });

      test('outgoing', function() {
        groupReturn.type = 'dialing';
        CallInfo.show(fakeNumber, fakeDate, fakeType, fakeStatus);

        assert.isTrue(classList.contains('icon-outgoing'));
        assert.isFalse(classList.contains('icon-incoming'));
        assert.isFalse(classList.contains('icon-missed'));
      });

      test('outgoing', function() {
        groupReturn.type = 'alerting';
        CallInfo.show(fakeNumber, fakeDate, fakeType, fakeStatus);

        assert.isTrue(classList.contains('icon-outgoing'));
        assert.isFalse(classList.contains('icon-incoming'));
        assert.isFalse(classList.contains('icon-missed'));
      });

      test('incoming', function() {
        groupReturn.type = 'incoming';
        groupReturn.status = 'connected';
        CallInfo.show(fakeNumber, fakeDate, fakeType, fakeStatus);

        assert.isFalse(classList.contains('icon-outgoing'));
        assert.isTrue(classList.contains('icon-incoming'));
        assert.isFalse(classList.contains('icon-missed'));
      });

      test('missed', function() {
        groupReturn.type = 'incoming';
        CallInfo.show(fakeNumber, fakeDate, fakeType, fakeStatus);

        assert.isFalse(classList.contains('icon-outgoing'));
        assert.isFalse(classList.contains('icon-incoming'));
        assert.isTrue(classList.contains('icon-missed'));
      });
    });
  });

  suite('action buttons', function() {
    var detailsButton;
    var addToContactButton;
    var createContactButton;

    setup(function() {
      detailsButton = document.getElementById('call-info-details');
      addToContactButton = document.getElementById('call-info-add');
      createContactButton = document.getElementById('call-info-create');

      this.sinon.spy(window, 'MozActivity');
    });

    suite('no contact', function() {
      test('only contact creation ones are displayed', function() {
        assert.isTrue(detailsButton.hidden);
        assert.isFalse(addToContactButton.hidden);
        assert.isFalse(createContactButton.hidden);
      });

      test('add a contact works', function() {
        addToContactButton.click();
        sinon.assert.calledWith(window.MozActivity, {
          name: 'update',
          data: {
            type: 'webcontacts/contact',
            params: {
              'tel': fakeNumber
            }
          }
        });
      });

      test('create a contact works', function() {
        createContactButton.click();
        sinon.assert.calledWith(window.MozActivity, {
          name: 'new',
          data: {
            type: 'webcontacts/contact',
            params: {
              'tel': fakeNumber
            }
          }
        });
      });
    });

    suite('with a contact', function() {
      setup(function() {
        groupReturn.contact = {
          primaryInfo: 'WESH'
        };
        CallInfo.show(fakeNumber, fakeDate, fakeType, fakeStatus);
        this.sinon.useFakeTimers();
      });

      teardown(function() {
        delete groupReturn.contact;
      });

      test('only contact details is displayed', function() {
        assert.isFalse(detailsButton.hidden);
        assert.isTrue(addToContactButton.hidden);
        assert.isTrue(createContactButton.hidden);
      });

      test('viewing contact details work', function() {
        detailsButton.click();
        assert.equal(window.location.hash, '#contacts-view');
        this.sinon.clock.tick();
        var url = 'index.html#view-contact-details?id=' +
        groupReturn.contact.id + '&tel=' + groupReturn.number +
        '&back_to_previous_tab=1&isMissedCall=false';
        assert.include(contactsIframe.src, url);
      });
    });
  });

  suite('Displaying a contact', function() {
    setup(function() {
      groupReturn.contact = {
        primaryInfo: 'WESH'
      };
      CallInfo.show(fakeNumber, fakeDate, fakeType, fakeStatus);
    });

    teardown(function() {
      delete groupReturn.contact;
    });

    test('title', function() {
      var callInfoTitle = document.getElementById('call-info-title');
      assert.equal(callInfoTitle.textContent, groupReturn.contact.primaryInfo);
    });
  });

});
