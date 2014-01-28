'use strict';

mocha.globals(['LockScreenMediator', 'LockScreenRouter']);

requireApp('system/js/lockscreen/router.js');

suite('system/LockScreenRouter >', function() {
  var mockMediator,
      mediator,
      router,
      helperPostMessageAssertion = function(
        fakeChannels,         // registered channels in the router
        targetChannels,       // how much channels should be notified
        channelsForRouting) { // channels to the posting method

        var originalApp = router.app,
            originalChannels = router.configs.channels,
            targetMessages = ['fakemessage'],
            pickedChannels = [],
            postedMessages = [],
            doAssertion = function() {
              targetChannels.forEach(function(channel) {
                assert.notEqual(-1, pickedChannels.indexOf(channel),
                  'the channel has been omitted:' + channel);
              });

              pickedChannels.forEach(function(channel) {
                assert.notEqual(-1, targetChannels.indexOf(channel),
                  'the channel has been notified even it\'s not the target: ' +
                  channel);
              });

              targetMessages.forEach(function(message) {
                assert.notEqual(-1, postedMessages.indexOf(message),
                  'message not sent: ' + message);
              });
            },
            fakePorts = [{
              postMessage: function(message) {
                postedMessages.push(message);
              }
            }],
            mockConnect = function(channel) {
              pickedChannels.push(channel);
              return {
                then: function(cb) {
                  cb(fakePorts);
                }
              };
            },
            mockApp = { 'connect': mockConnect };
        router.app = mockApp;
        router.configs.channels = fakeChannels;
        router.post('fakemessage', channelsForRouting);
        doAssertion();
        router.app = originalApp;
        router.configs.channels = originalChannels;
      };

  setup(function() {
    mockMediator = function() {
      this.router = null;
      this.broadcast = function() {};
      this.notify = function() {};
    };
    mediator = new mockMediator();
    router = new window.LockScreenRouter(mediator);
  });

  teardown(function() {
  });

  suite('messages from router to mediator', function() {
    test('with channel', function(done) {
      var stubBroadcast = this.sinon.stub(mediator, 'broadcast',
        function(message, channel) {
          console.log(message, channel);
          assert.equal('fakemessage', message,
            'the forwarded message is incorrect');
          assert.equal('fakechannel', channel,
            'the forwarded channel is incorrect');
          done();
        });
      router.handleEvent(new CustomEvent('iac-fakechannel',
        {'detail': 'fakemessage'}));
      assert.isTrue(stubBroadcast.called,
        'the router didn\'t forward the message to the mediator');
    });
  });
  suite('messages from mediator to router', function() {
    test('totally post: to all channels', function() {
      helperPostMessageAssertion(
        ['fakeA', 'fakeB', 'fakeC'],
        ['fakeA', 'fakeB', 'fakeC']);
    });

    test('partially post: only to some channels', function() {
      helperPostMessageAssertion(
        ['fakeA', 'fakeB', 'fakeC'],
        ['fakeA', 'fakeB'],
        ['fakeA', 'fakeB']);
    });

    test('singleton post: only to one channel', function() {
      helperPostMessageAssertion(
        ['fakeA', 'fakeB', 'fakeC'],
        ['fakeB'],
        'fakeB');
    });
  });
});
