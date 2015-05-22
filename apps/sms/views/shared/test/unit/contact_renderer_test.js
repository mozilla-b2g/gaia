
/*global ContactRenderer, loadBodyHTML, MockContact, MockL10n, MocksHelper,
         Utils, Template, MockContactPhotoHelper, SharedComponents,
         MockSettings,
         AssetsHelper
*/

'use strict';

require('/views/shared/js/shared_components.js');
require('/views/shared/js/utils.js');
require('/views/shared/test/unit/mock_utils.js');

require('/views/shared/test/unit/mock_contact.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_contact_photo_helper.js');
require('/views/shared/js/contact_renderer.js');
require('/views/shared/test/unit/mock_settings.js');

var mocksHelperForContactRenderer = new MocksHelper([
  'Utils',
  'ContactPhotoHelper',
  'Settings'
]).init();

suite('ContactRenderer', function() {
  var realMozL10n;

  var ul, contact;
  var testImageBlob;
  var renderer, unknownRender;

  mocksHelperForContactRenderer.attachTestHelpers();

  suiteSetup(function(done) {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    AssetsHelper.generateImageBlob(400, 400, 'image/jpeg', 0.5).then(
      (blob) => {
        testImageBlob = blob;
      }
    ).then(done, done);
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
    realMozL10n = null;
  });

  setup(function() {
    loadBodyHTML('/index.html');

    this.sinon.spy(Template.prototype, 'interpolate');
    ul = document.createElement('ul');
    contact = MockContact();
  });

  suite('suggestion', function() {
    setup(function() {
      renderer = ContactRenderer.flavor('suggestion');
    });

    test('Rendered Contact "givenName familyName"', function() {
      var html;

      renderer.render({
        contact: contact,
        input: 'foo',
        target: ul
      });

      sinon.assert.calledWithMatch(Template.prototype.interpolate, {
        carrier: 'TEF',
        name: 'Pepito O\'Hare',
        nameHTML: 'Pepito O&apos;Hare',
        number: '+346578888888',
        phoneDetailsHTML: SharedComponents.phoneDetails(
          {
            number: '+346578888888',
            type: 'Mobile',
            carrier: 'TEF'
          }
        ).toString(),
        photoHTML: '',
        type: 'Mobile'
      });

      html = ul.firstElementChild.innerHTML;
      assert.include(html, 'Pepito O\'Hare');
    });

    test('Rendered Contact highlighted "givenName familyName"', function() {
      var html;

      renderer.render({
        contact: contact,
        input: 'Pepito O\'Hare',
        target: ul
      });

      html = ul.firstElementChild.innerHTML;

      assert.include(html, '<span class="highlight">Pepito</span>');
      assert.include(html, '<span class="highlight">O\'Hare</span>');
    });

    test('Rendered Contact "number"', function() {
      var html;

      contact.tel[0].carrier = null;
      contact.tel[0].type = null;

      renderer.render({
        contact: contact,
        input: 'foo',
        target: ul
      });

      html = ul.firstElementChild.innerHTML;

      assert.ok(html.includes('+346578888888'));
    });

    test('Rendered Contact highlighted "number"', function() {
      var html;

      contact.tel[0].carrier = null;
      contact.tel[0].type = null;

      renderer.render({
        contact: contact,
        input: '346578888888',
        target: ul
      });

      sinon.assert.calledWithMatch(Template.prototype.interpolate, {
        carrier: '',
        name: 'Pepito O\'Hare',
        nameHTML: 'Pepito O&apos;Hare',
        number: '+346578888888',
        phoneDetailsHTML: SharedComponents.phoneDetails(
          { number: '+<span class="highlight">346578888888</span>' },
          { safe: ['number'] }
        ).toString(),
        photoHTML: '',
        type: ''
      });

      html = ul.firstElementChild.innerHTML;

      assert.ok(
        html.includes('+<span class="highlight">346578888888</span>')
      );
    });

    test('Rendered Contact highlighted "name number"', function() {
      var html;

      renderer.render({
        contact: contact,
        input: 'Pepito 346578888888',
        target: ul
      });

      html = ul.firstElementChild.innerHTML;

      assert.include(html, '<span class="highlight">Pepito</span>');
      assert.include(html, '+<span class="highlight">346578888888</span>');
    });

    test('Rendered Contact with type and number', function() {
      this.sinon.spy(SharedComponents, 'phoneDetails');

      contact.tel[0].carrier = null;

      renderer.render({
        contact: contact,
        input: 'foo',
        target: ul
      });

      sinon.assert.calledWith(
        SharedComponents.phoneDetails,
        {
          number: contact.tel[0].value,
          type: contact.tel[0].type[0],
          carrier: ''
        },
        { safe: ['number'] }
      );
    });

    test('Rendered Contact with type and highlighted number', function() {
      this.sinon.spy(SharedComponents, 'phoneDetails');

      contact.tel[0].carrier = null;

      renderer.render({
        contact: contact,
        input: '346578888888',
        target: ul
      });

      sinon.assert.calledWith(
        SharedComponents.phoneDetails,
        {
          number: '+<span class="highlight">346578888888</span>',
          type: contact.tel[0].type[0],
          carrier: ''
        },
        { safe: ['number'] }
      );
    });

    test('Rendered Contact with type, number and carrier', function() {
      this.sinon.spy(SharedComponents, 'phoneDetails');

      renderer.render({
        contact: contact,
        input: 'foo',
        target: ul
      });

      sinon.assert.calledWith(
        SharedComponents.phoneDetails,
        {
          number: contact.tel[0].value,
          type: contact.tel[0].type[0],
          carrier: contact.tel[0].carrier
        },
        { safe: ['number'] }
      );
    });

    test('Rendered Contact with type, highlighted number and carrier',
    function() {
      this.sinon.spy(SharedComponents, 'phoneDetails');

      renderer.render({
        contact: contact,
        input: '346578888888',
        target: ul
      });

      sinon.assert.calledWith(
        SharedComponents.phoneDetails,
        {
          number: '+<span class="highlight">346578888888</span>',
          type: contact.tel[0].type[0],
          carrier: contact.tel[0].carrier
        },
        { safe: ['number'] }
      );
    });

    test('Rendered Contact "email"', function() {
      MockSettings.supportEmailRecipient = true;
      var html;

      contact.email[0].type = null;

      renderer.render({
        contact: contact,
        input: 'foo',
        target: ul
      });

      html = ul.lastElementChild.innerHTML;

      assert.ok(html.includes('a@b.com'));
    });

    test('Rendered Contact highlighted "email"', function() {
      MockSettings.supportEmailRecipient = true;
      var html;

      contact.email[0].type = null;

      renderer.render({
        contact: contact,
        input: 'a@b.com',
        target: ul
      });

      sinon.assert.calledWithMatch(Template.prototype.interpolate, {
        carrier: '',
        name: 'Pepito O\'Hare',
        nameHTML: 'Pepito O&apos;Hare',
        number: 'a@b.com',
        numberHTML: '<span class="highlight">a@b.com</span>',
        photoHTML: '',
        type: ''
      });

      html = ul.lastElementChild.innerHTML;

      assert.ok(
        html.includes('<span class="highlight">a@b.com</span>')
      );
    });

    test('Rendered Contact highlighted "name email"', function() {
      MockSettings.supportEmailRecipient = true;
      var html;

      renderer.render({
        contact: contact,
        input: 'Pepito a@b.com',
        target: ul
      });

      html = ul.lastElementChild.innerHTML;

      assert.include(html, '<span class="highlight">Pepito</span>');
      assert.include(html, '<span class="highlight">a@b.com</span>');
    });

    test('Rendered Contact "type | email"', function() {
      var html;

      renderer.render({
        contact: contact,
        input: 'foo',
        target: ul
      });

      html = ul.lastElementChild.innerHTML;

      assert.isFalse(html.includes(
      '<span data-l10n-id="Personal">Personal</span> | ' + 'a@b.com'));
    });

    test('Rendered Contact highlighted "type | email"', function() {
      var html;

      renderer.render({
        contact: contact,
        input: 'a@b.com',
        target: ul
      });

      html = ul.lastElementChild.innerHTML;

      assert.isFalse(html.includes(
        '<span data-l10n-id="Personal">Personal</span> | ' +
        '<span class="highlight">a@b.com</span>'
      ));
    });

    test('Rendered Contact w/ multiple: all (isSuggestion) ' +
         'and No Support EmailRecipient ',
      function() {
      MockSettings.supportEmailRecipient = false;
      renderer.render({
        contact: contact,
        input: '+12125559999',
        target: ul
      });

      assert.equal(ul.children.length, 2);
    });

    test('Rendered Contact w/ multiple: all (isSuggestion) ' +
         'and Support EmailRecipient ',
      function() {
      MockSettings.supportEmailRecipient = true;
      renderer.render({
        contact: contact,
        input: '+12125559999',
        target: ul
      });

      assert.equal(ul.children.length, 3);
    });

    test('Rendered Contact omit numbers already in recipient list ' +
         'and No Support EmailRecipient ',
      function() {
      MockSettings.supportEmailRecipient = false;
      var html;

      var skip = ['+346578888888'];

      // This contact has two tel entries.
      renderer.render({
        contact: contact,
        input: '+346578888888',
        target: ul,
        skip: skip
      });

      html = ul.innerHTML;

      assert.ok(!html.includes('346578888888'));
      assert.equal(ul.children.length, 1);
    });

    test('Rendered Contact omit numbers already in recipient list ' +
         'and Support EmailRecipient ',
      function() {
      MockSettings.supportEmailRecipient = true;
      var html;

      var skip = ['+346578888888'];

      // This contact has two tel entries.
      renderer.render({
        contact: contact,
        input: '+346578888888',
        target: ul,
        skip: skip
      });

      html = ul.innerHTML;

      assert.ok(!html.includes('346578888888'));
      assert.equal(ul.children.length, 2);
    });

    test('Rendered Contact omit emails already in recipient list ' +
         'and Support EmailRecipient ',
      function() {
      MockSettings.supportEmailRecipient = true;
      var html;

      var skip = ['a@b.com'];

      // This contact has three tel entries.
      renderer.render({
        contact: contact,
        input: 'a@b.com',
        target: ul,
        skip: skip
      });

      html = ul.innerHTML;

      assert.ok(!html.includes('a@b.com'));
      assert.equal(ul.children.length, 2);
    });

    test('does not include photo', function() {
      var html;

      renderer.render({
        contact: contact,
        input: 'foo',
        target: ul
      });
      html = ul.firstElementChild.innerHTML;

      assert.isFalse(html.includes('span[data-type=img]'));
    });

    test('append information block in the li', function() {
      var li;
      var block = document.createElement('div');
      var selector = '.suggestion';

      renderer.render({
        contact: contact,
        input: 'Additional info',
        infoBlock: block,
        infoBlockParentSelector: selector,
        target: ul
      });
      li = ul.lastElementChild;

      assert.isTrue(!!li.querySelector(selector));
      assert.equal(li.querySelector(selector).lastElementChild, block);
    });

    test('Rendered no "Tel" and No Support EmailRecipient ', function() {

      contact.tel = null;
      MockSettings.supportEmailRecipient = false;
      var result = renderer.render({
        contact: contact,
        input: 'foo',
        target: ul
      });
      assert.isFalse(result);
    });

    test('Rendered no "email" and No Support EmailRecipient ', function() {

      contact.email = null;
      MockSettings.supportEmailRecipient = false;
      var result = renderer.render({
        contact: contact,
        input: 'foo',
        target: ul
      });
      assert.ok(result);
    });

    test('Rendered no "Tel" and Support EmailRecipient ', function() {

      contact.tel = null;
      MockSettings.supportEmailRecipient = true;
      var result = renderer.render({
        contact: contact,
        input: 'foo',
        target: ul
      });
      assert.ok(result);
    });

    test('Rendered no "email" and Support EmailRecipient ', function() {

      contact.email = null;
      MockSettings.supportEmailRecipient = true;
      var result = renderer.render({
        contact: contact,
        input: 'foo',
        target: ul
      });
      assert.ok(result);
    });

    test('Rendered no "Tel"/"email" and Support EmailRecipient ', function() {

      contact.tel = null;
      contact.email = null;
      MockSettings.supportEmailRecipient = true;
      var result = renderer.render({
        contact: contact,
        input: 'foo',
        target: ul
      });
      assert.isFalse(result);
    });
  });

  suite('suggestionUnknown', function() {
    var html;
    var unknownContact = {
      name: ['unknown'],
      tel: [{value: '+346578888888'}]
    };
    setup(function() {
      unknownRender = ContactRenderer.flavor('suggestionUnknown');
    });

    test('Rendered unknownContact "number"', function() {

      unknownContact.tel[0].carrier = null;
      unknownContact.tel[0].type = null;

      unknownRender.render({
        contact: unknownContact,
        input: 'foo',
        target: ul
      });

      html = ul.firstElementChild.innerHTML;

      assert.ok(html.includes('+346578888888'));
    });

    test('Rendered unknownContact highlighted "number"', function() {

      unknownContact.tel[0].carrier = null;
      unknownContact.tel[0].type = null;

      unknownRender.render({
        contact: unknownContact,
        input: '346578888888',
        target: ul
      });

      sinon.assert.calledWithMatch(Template.prototype.interpolate, {
        carrier: '',
        name: 'unknown',
        nameHTML: 'unknown',
        number: '+346578888888',
        phoneDetailsHTML: SharedComponents.phoneDetails(
          { number: '+<span class="highlight">346578888888</span>' },
          { safe: ['number'] }
        ).toString(),
        photoHTML: '',
        type: ''
      });

      html = ul.firstElementChild.innerHTML;

      assert.ok(
        html.includes('+<span class="highlight">346578888888</span>')
      );
    });

    test('Rendered unknownContact omit numbers already in recipient list',
    function() {

      var skip = ['+346578888888'];

      // This unknownContact has two tel entries.
      unknownRender.render({
        contact: unknownContact,
        input: '+346578888888',
        target: ul,
        skip: skip
      });

      html = ul.innerHTML;

      assert.ok(!html.includes('346578888888'));
      assert.equal(ul.children.length, 0);
    });

    test('does not include photo', function() {

      unknownRender.render({
        contact: unknownContact,
        input: 'foo',
        target: ul
      });
      html = ul.firstElementChild.innerHTML;

      assert.isFalse(html.includes('span[data-type=img]'));
     });

   });


  suite('prompt', function() {
    setup(function() {
      renderer = ContactRenderer.flavor('prompt');
    });

    test('Rendered Contact w/ multiple: one', function() {
      renderer.render({
        contact: contact,
        input: '+12125559999',
        target: ul
      });

      assert.equal(ul.children.length, 1);
    });

    test('Rendered Contact w/ multiple: one w/ minimal match', function() {
      renderer.render({
        contact: contact,
        input: '5559999',
        target: ul
      });

      assert.equal(ul.children.length, 1);
    });

    test('Render contact without photo does not render the photo', function() {
      var html;
      renderer.render({
        contact: contact,
        input: '5559999',
        target: ul
      });
      html = ul.firstElementChild.innerHTML;

      assert.isFalse(html.includes('span[data-type=img]'));
    });

    test('Render contact with photo renders the image', function() {
      var html;
      var blob = testImageBlob;
      this.sinon.stub(MockContactPhotoHelper, 'getThumbnail').returns(blob);
      this.sinon.spy(Utils, 'asyncLoadRevokeURL');
      this.sinon.spy(Utils, 'getContactDetails');
      this.sinon.spy(window, 'encodeURI');

      renderer.render({
        contact: contact,
        input: '5559999',
        target: ul
      });

      sinon.assert.calledWith(Template.prototype.interpolate, undefined);

      var photo = 'data-type="img"';
      sinon.assert.calledWithMatch(Template.prototype.interpolate, {
        carrier: 'XXX',
        name: 'Pepito O\'Hare',
        nameHTML: 'Pepito O&apos;Hare',
        number: '+12125559999',
        phoneDetailsHTML: SharedComponents.phoneDetails(
          {
            number: '+12125559999',
            type: 'B',
            carrier: 'XXX'
          },
          { safe: ['number'] }
        ).toString(),
        photoHTML: sinon.match(photo),
        type: 'B'
      });

      html = ul.firstElementChild.innerHTML;
      var contactPhotoElement = ul.firstElementChild.querySelector(
        '.contact-photo'
      );

      assert.ok(html.includes('span'));
      assert.ok(contactPhotoElement.style.backgroundImage.indexOf('blob:') > 0);
      sinon.assert.calledWith(
        encodeURI,
        Utils.getContactDetails.returnValues[0].photoURL
      );
      sinon.assert.calledWith(
        Utils.asyncLoadRevokeURL,
        Utils.getContactDetails.returnValues[0].photoURL
      );
    });
  });

  suite('Secure User Input', function() {
    setup(function() {
      this.sinon.stub(Utils, 'getContactDetails', function(number, contacts) {
        return {
          isContact: !!contacts,
          title: number
        };
      });
    });

    test('+99', function() {
      var ul = document.createElement('ul');

      assert.doesNotThrow(function() {
        var renderer = ContactRenderer.flavor('suggestion');

        renderer.render({
          contact: {
            name: 'Spider Monkey',
            tel: [{ value: '...' }]
          },
          input: '+99',
          target: ul
        });
      });

      sinon.assert.calledWith(Utils.getContactDetails, '...');
    });

    test('*67 [800]-555-1212', function() {
      var ul = document.createElement('ul');

      assert.doesNotThrow(function() {
        var renderer = ContactRenderer.flavor('suggestion');
        renderer.render({
          contact: {
            name: 'Spider Monkey',
            tel: [{ value: '...' }]
          },
          input: '*67 [800]-555-1212',
          target: ul
        });
      });

      sinon.assert.calledWith(Utils.getContactDetails, '...');
    });

    test('\\^$*+?.', function() {
      var ul = document.createElement('ul');
      assert.doesNotThrow(function() {
        var renderer = ContactRenderer.flavor('suggestion');
        renderer.render({
          contact: {
            name: 'Spider Monkey',
            tel: [{ value: '...' }]
          },
          input: '\\^$*+?.',
          target: ul
        });
      });
      sinon.assert.calledWith(Utils.getContactDetails, '...');
    });
  });

  suite('Defensive Contact Rendering', function() {
    test('has tel number', function() {
      var ul = document.createElement('ul');
      var contact = new MockContact();

      var renderer = ContactRenderer.flavor('suggestion');
      var isRendered = renderer.render({
        contact: contact,
        input: contact.tel[0].value,
        target: ul
      });

      assert.isTrue(isRendered);
    });

    test('no tel number, has email address', function() {
      MockSettings.supportEmailRecipient = true;
      var ul = document.createElement('ul');
      var contact = new MockContact();
      contact.tel = null;

      var renderer = ContactRenderer.flavor('suggestion');
      var isRendered = renderer.render({
        contact: contact,
        input: contact.email[0].value,
        target: ul
      });

      assert.isTrue(isRendered);
    });

    test('has tel number, no email address', function() {
      MockSettings.supportEmailRecipient = true;
      var ul = document.createElement('ul');
      var contact = new MockContact();
      contact.email = null;

      var renderer = ContactRenderer.flavor('suggestion');
      var isRendered = renderer.render({
        contact: contact,
        input: contact.tel[0].value,
        target: ul
      });

      assert.isTrue(isRendered);
    });

    test('no tel number, no email address', function() {
      MockSettings.supportEmailRecipient = true;
      var ul = document.createElement('ul');
      var contact = new MockContact();
      contact.tel = null;
      contact.email = null;

      var renderer = ContactRenderer.flavor('suggestion');
      var isNotRendered = renderer.render({
        contact: contact,
        input: null,
        target: ul
      });

      assert.isFalse(isNotRendered);
    });
  });

  suite('report-view', function() {
    var renderer;

    setup(function() {
      renderer = ContactRenderer.flavor('report-view');
    });

    test('correct rendering', function() {
      var selector = '.js-contact-info';
      var infoBlock = document.createElement('div');

      renderer.render({
        contact: contact,
        target: ul,
        input: contact.tel[0].value,
        infoBlock: infoBlock,
        infoBlockParentSelector: selector,
      });

      var contactInfo = ul.querySelector(selector);
      assert.isTrue(contactInfo.contains(infoBlock));
      assert.notEqual(contactInfo.tagName, 'A');
    });
  });

  suite('group-view', function() {
    var renderer;

    setup(function() {
      renderer = ContactRenderer.flavor('group-view');
    });

    test('correct rendering', function() {
      var selector = '.js-contact-info';

      renderer.render({
        contact: contact,
        target: ul,
        input: contact.tel[0].value
      });

      var contactInfo = ul.querySelector(selector);
      assert.equal(contactInfo.tagName, 'A');
    });
  });
});

