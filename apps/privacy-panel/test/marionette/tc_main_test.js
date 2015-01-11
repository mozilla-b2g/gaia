/* global __dirname */
'use strict';

var assert = require('assert');
var TcMainPanel = require('./lib/panels/tc_main');

/**
 * For this test, we're using these three fake apps:
 *
 * +--------+-------------------+----------------------+-----------------------+
 * |        | mightyD           | chubbyU              | flyingP               |
 * +--------+-------------------+----------------------+-----------------------+
 * | name   | Mighty Duck       | Chubby Unicorn       | Flying Platypus       |
 * | trust  | privileged        | web                  | privileged            |
 * | vendor | Ducklings Inc.    | Unicorns Ltd.        | Platypus Corp.        |
 * | origin | mighty.duck.com   | chubby.unicorn.com   | flying.platypus.com   |
 * | path   | /apps/mighty-duck | /apps/chubby-unicorn | /apps/flying-platypus |
 * +--------+-------------------+----------------------+-----------------------+
 */

marionette('transparency control panels', function() {

  var client = marionette.client({
    settings: {
      'privacy-panel-gt-complete': true
    },
    prefs: {
      'focusmanager.testmode': true
    },
    apps: {
      'mighty.duck.com':     __dirname + '/apps/mighty-duck',
      'chubby.unicorn.com':  __dirname + '/apps/chubby-unicorn',
      'flying.platypus.com': __dirname + '/apps/flying-platypus'
    }
  });

  var subject;
  setup(function() {
    subject = new TcMainPanel(client);
    subject.init();
  });


  /**
   * useful selectors
   */
  var app = {
    chubbyU: 'li[data-key="Chubby Unicorn"]',  // fake app
    flyingP: 'li[data-key="Flying Platypus"]', // fake app
    mightyD: 'li[data-key="Mighty Duck"]',     // fake app
    browser: 'li[data-key="Browser"]' // real Browser app, uses Contacts perm
  };
  var vendor = {
    chubbyU: 'ul[data-key="Unicorns Ltd."]',
    flyingP: 'ul[data-key="Platypus Corp."]',
    mightyD: 'ul[data-key="Ducklings Inc."]',
    browser: 'ul[data-key="The Gaia Team"]'
  };
  var trust = {
    'certified':  'ul[data-key="certified"]',
    'privileged': 'ul[data-key="privileged"]',
    'web':        'ul[data-key="web"]'
  };
  var perm = {
    contacts: '[data-key="contacts"]',
    storage: '[data-key="storage"]'
  };


  test('main panel', function() {
    var menuItems = client.findElements('#tc-main li');
    assert.ok(menuItems.length === 2);
  });

  test('Applications panel and sub-panel', function() {

    function find(selector) {
      return subject.appPanel.findElement(selector);
    }

    // load Applications panel
    subject.tapOnAppMenuItem();
    assert.ok(subject.isAppDisplayed());

    // check that all fake apps are displayed alphabetically by default
    assert.ok(find(app.chubbyU));
    assert.ok(find(app.flyingP));
    assert.ok(find(app.mightyD));
    assert.ok(find(app.chubbyU + ' ~ ' + app.flyingP));
    assert.ok(find(app.flyingP + ' ~ ' + app.mightyD));

    // use the search box to filter apps
    subject.enterSearchMode();
    subject.sendSearchKeys('i'); // our 3 fake apps have an 'i' in their name
    assert.ok(find(app.chubbyU).displayed());
    assert.ok(find(app.flyingP).displayed());
    assert.ok(find(app.mightyD).displayed());
    subject.sendSearchKeys('g'); // only 'Mighty Duck' has 'ig' in its name
    assert.ok(!find(app.chubbyU).displayed());
    assert.ok(!find(app.flyingP).displayed());
    assert.ok(find(app.mightyD).displayed());
    subject.clearSearch(); // empty the search box
    assert.ok(subject.searchPattern === '');
    assert.ok(find(app.chubbyU).displayed());
    assert.ok(find(app.flyingP).displayed());
    assert.ok(find(app.mightyD).displayed());

    // enter the search mode again, get out of it by selecting an app
    subject.sendSearchKeys('browser');
    assert.ok(find(app.browser).displayed());
    find(app.browser).tap();
    assert.ok(subject.isAppDetailDisplayed());
    assert.ok(subject.appDetail.findElement(perm.contacts));
    // press the 'back' button, ensure we're not in search mode any more
    subject.tapOnAppDetailBack();
    assert.ok(!subject.isSearchCloseDisplayed());
    assert.ok(subject.isSortKeyDisplayed());

    // switch to "Trust Level" order
    subject.sortApps('Trust Level', trust.web);
    // check that each app is in its 'Trust Level' group
    assert.ok(find(trust.privileged + ' > ' + app.flyingP));
    assert.ok(find(trust.privileged + ' > ' + app.mightyD));
    assert.ok(find(trust.web        + ' > ' + app.chubbyU));
    // these two apps belong to the same group, and should be sorted
    assert.ok(find(app.flyingP + ' ~ ' + app.mightyD));

    // switch to "Vendor" order
    subject.sortApps('Vendor', vendor.chubbyU);
    // check that each app is in its 'Vendor' group
    assert.ok(find(vendor.chubbyU + ' > ' + app.chubbyU));
    assert.ok(find(vendor.flyingP + ' > ' + app.flyingP));
    assert.ok(find(vendor.mightyD + ' > ' + app.mightyD));
    // check that 'Vendor' groups are sorted alphabetically
    assert.ok(find(vendor.mightyD + ' ~ ' + vendor.flyingP));
    assert.ok(find(vendor.flyingP + ' ~ ' + vendor.chubbyU));

  });

  test('Permissions panel and sub-panel', function() {

    function find(selector) {
      return subject.permPanel.findElement(selector);
    }

    // load Permissions panel
    subject.tapOnPermMenuItem();
    assert.ok(subject.isPermDisplayed());

    // check that this panel displays permission items
    assert.ok(find(perm.contacts));
    assert.ok(find(perm.storage));

    // open 'Contacts' details and check that 'Browser' is listed
    find(perm.contacts).tap();
    assert.ok(subject.isPermDetailDisplayed());
    assert.ok(subject.permDetail.findElement(app.browser));

  });

});
