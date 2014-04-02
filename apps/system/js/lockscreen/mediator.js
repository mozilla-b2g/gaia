/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * The LockScreen now is a mediator, which would only handle
 *
 * 1. request unlock/lock
 * 2. request invoke something
 * 3. request to register/unregister a widget
 * 4. request an element (canvas) to manipulate
 *
 * from widgets. It also would bootstrap necessary components like
 * LockScreenRouter and LockScreenFactory to help passing message
 * and creating widget.
 *
 * Some basic states like `locked` would also be maintained by this
 * mediator, and it would be broadcast with `(oldVal, newVal)`
 * when them get changed.
 *
 * Widget should only call those methods tagged with '@public'.
 */
(function(exports) {

  /**
   * This constructor would create both router and widget factory, and then
   * bootstrap some default widgets. In the future, we may provide a highly
   * customizable way to change the default widget set. But currently, we must
   * hard-coded them in this component.
   *
   * The mediator would be the first instantiated component in the LockScreen,
   * and it is also the only one component need to be instantiated explicitly.
   *
   * @constructor LockScreenMediator
   */
  var LockScreenMediator = function() {
    this.setup();

    this.initElements();
    this.bootstrap();
  };

  /**
   * Set up the prototype of this instance.
   *
   * @this {LockScreenMediaotr}
   * @member LockScreenMediator
   */
  LockScreenMediator.prototype.setup = function() {
    this.router = new window.LockScreenRouter(this);
    this.factory = new window.LockScreenWidgetFactory(this);
    this.states = {
      locked: false
    };
    this.elements ={
      lockscreen: null
    };
    this.configs = {
      widgetset: [
        'Slide',
        'UnlockingSound'
      ]
    };
    this.widgets = {};
    // Auditors would be asked before we do unlock.
    this.unlockAuditors = {};
  };

  /**
   * Public interface allows widgets submit their requests.
   * The request should be:
   *
   *     { from: string (widget name),
   *       type: string (invoke|unlock|canvas|lock)
   *       content: { more detail of this request }
   *     }
   *
   * The specification of the request content can be found at each response
   * method in this class. For example, the invoke request's content would be
   * different among invoking secureapp, widget and activity. So we can find
   * the detail at the `responseInvoke` method.
   *
   * @param {object} request - as the above comments described.
   * @this {LockScreenMediator}
   * @memberof LockScreenMediator
   * @public
   */
  LockScreenMediator.prototype.request =
  function lsm_request(request) {
    var widgetName = request.from,
        type = request.type,
        content = request.content,
        widget = this.widgets[widgetName];

    // Only handle registered widgets.
    if (!widget) {
      switch (type) {
        case 'register-widget':
          this.register(widgetName, content.widget,
              content.options);
          break;
      }
    } else {
      switch(request.type) {
        case 'unregister-widget':
          this.unregister(widgetName);
          break;
        case 'lock':
          this.responseLock();
          break;
        case 'unlock':
          this.responseUnlock();
          break;
        case 'invoke':
          this.responseInvoke(request.content);
          break;
        case 'canvas':
          this.responseCanvas(request.content);
          break;
      }
    }
  };

  /**
   * Post message through router to the outside world.
   * Widgets can call this method to post any messages.
   *
   * Although this method is just a forwarding method, and have the same
   * interface with the router's, widgets should never directly call the
   * method of the router.
   *
   * @param {object} message - anything
   * @param {string} channel - (optional) as the same as the router's
   * @this {LockScreenMediator}
   * @memberof LockScreenMediator
   * @public
   */
  LockScreenMediator.prototype.post =
  function lsm_post(message, channel) {
    this.router.post(message, channel);
  };

  /**
   * To grab the elements needed by the mediator.
   * In theory, the mediator should need only few DOMs to initialize itself.
   *
   * @this {LockScreenMediator}
   * @memberof LockScreenMediator
   */
  LockScreenMediator.prototype.initElements =
  function lsm_initElemenents() {
    this.elements.lockscreen = document.getElementById('lockscreen');
    // TODO: Remove this if we switched from the legacy lockscreen.
    this.elements.lockscreen.classList.remove('no-transition');
  };


  /**
   * Register a widget. Would also activate it.
   *
   * @param {string} name - the widget name
   * @param {Widget} widget - the widget
   * @param {object} opts - additional options like 'unlockAuditor'
   * @this {LockScreenMediator}
   * @memberof LockScreenMediator
   */
  LockScreenMediator.prototype.register =
  function lsm_register(name, widget, opts) {
    var {unlockAuditor} = opts || {};
    if (this.widgets[name]) {
      return;
    }
    this.widgets[name] = widget;
    if (unlockAuditor) {
      this.unlockAuditors[name] = widget;
    }
    widget.activate();
  };

  /**
   * Unregister a widget. Would also deactive it.
   *
   * @param {string} name - the widget name
   * @this {LockScreenMediator}
   * @memberof LockScreenMediator
   */
  LockScreenMediator.prototype.unregister =
  function lsm_unregister(name) {
    if (!this.widgets[name]) {
      return;
    }
    var widget = this.widgets[name];
    widget.deactivate();
    delete this.widgets[name];
    if (this.unlockAuditors[name]) {
      delete this.unlockAuditors[name];
    }
  };

  /**
   * Response the lock request.
   *
   * @this {LockScreenMediator}
   * @memberof LockScreenMediator
   */
  LockScreenMediator.prototype.responseLock =
  function lsm_requestLock() {
    // TODO: Do real lock. This is for demo.
    // Must handle passcode.
    self.lockScreen.lock();
  };

  /**
   * Response the unlock request.
   * It may not unlock if there is any auditors disagree with it.
   * Please note that the auditors may do something with side-effects,
   * like prompting the passcode panel and wait user input.
   *
   * @this {LockScreenMediator}
   * @memberof LockScreenMediator
   */
  LockScreenMediator.prototype.responseUnlock =
  function lsm_requestUnlock() {
    if (!this.askToUnlock()) {
      return;
    }
    this.unlock();
  };

  /**
   * Response the invocation. It would invoke different things according
   * to the detail of the request.
   *
   * @param {object} requestContent - see how the request be packaged in the
   *                                  LockScreenBasicWidget#request
   *                                  (invoke series).
   * @this {LockScreenMediator}
   * @memberof LockScreenMediator
   */
  LockScreenMediator.prototype.responseInvoke =
  function lsm_responseInvoke(requestContent) {
    // Target: SecureApp, Widget or Activity.
    var {method, detail} = requestContent,
        fn = (method === 'secureapp') ?
             this.invokeSecureApp.bind(this) :
             ((method === 'activity') ?
             this.invokeActivity.bind(this) :
             this.invokeWidget.bind(this));
    fn(detail);
  };

  /**
   * Response the request that some widget need a canvas to draw itself.
   *
   * @param {object} requestContent - see how the request be packaged in the
   *                                  LockScreenBasicWidget#requestCanvas
   * @this {LockScreenMediator}
   * @memberof LockScreenMediator
   */
  LockScreenMediator.prototype.responseCanvas =
  function lsm_responseCanvas(requestContent) {
    var {method, selector, response} = requestContent,
        fn = (method === 'id') ?
          document.getElementById.bind(document) :
          document.querySelector.bind(document),
        canvas = fn(selector);

    // TODO: If we have shadow DOM here, we can isolate widgets better.
    if (!canvas) {
      throw new Error('Can\t locate the widget canvas element with selector: ' +
        selector);
    }
    response(canvas);
  };

  /**
   * Invoke a secure app.
   *
   * @this {LockScreenMediator}
   * @memberof LockScreenMediator
   */
  LockScreenMediator.prototype.invokeSecureApp =
  function lsm_invokeSecureApp(detail) {
    var {url, manifestURL} = detail;
    this.post({
      'type': 'secure-launchapp',
      'detail':{
        'appURL': url,
        'appManifestURL': manifestURL
      }
    });
  };

  /**
   * Invoke an activity. If we can't unlock to send the activity,
   * this function return return false and do nothing.
   *
   * @return {boolean}
   * @this {LockScreenMediator}
   * @memberof LockScreenMediator
   */
  LockScreenMediator.prototype.invokeActivity =
  function lsm_invokeActivity(detail) {
    // If unlocking is not permitted, do nothing.
    if (!this.askToUnlock()) {
      return false;
    }
    var {content, onsuccess, onerror} = detail,
        activity = new window.MozActivity(content);
    activity.onerror   = onerror   || (()=>{});
    activity.onsuccess = onsuccess || (()=>{});
    this.unlock();
    return true;
  };

  /**
   * Invoke a widget. Would create it or activate it (if it exists).
   *
   * @this {LockScreenMediator}
   * @memberof LockScreenMediator
   */
  LockScreenMediator.prototype.invokeWidget =
  function lsm_invokeWidget(request) {
    if (!this.widgets[request.name]) {
      this.factory.launch(request.name);
    } else {
      this.widgets[request.name].activate();
    }
  };

  /**
   * To see if we can unlock now, or some auditors would not agree with that.
   * Note that the auditors can handle this request with some side-effects,
   * like prompting the passcode panel, or check the settings.
   * And it would need to wait all unlocking auditors to response, so the
   * function may not return immediately (for example, passcode widget may
   * return the result only after user input the incorrect or wrong passcode).
   *
   * @return {boolean} - if false, we can't unlock the screen
   * @this {LockScreenMediator}
   * @memberof LockScreenMediator
   */
  LockScreenMediator.prototype.askToUnlock =
  function lsm_askToUnlock() {
    // If anyone says 'no', we won't unlock.
    for (var name in this.unlockAuditors) {
      var auditor = this.unlockAuditors[name];
      if (!auditor.permitUnlock()) {
        return false;
      }
    }
    return true;
  };

  /**
   * Do the unlock.
   *
   * @this {LockScreenMediator}
   * @memberof LockScreenMediator
   */
  LockScreenMediator.prototype.unlock =
  function lsm_unlock() {
    this.broadcastStateChanged('locked', 'locked', 'will-unlock');
    this.post('will-unlock');
    this.post('secure-modeoff');
    var app = window.AppWindowManager ?
        window.AppWindowManager.getActiveApp() : null,
        // TODO: The instant unlocking, which and when will use it?
        repaintTimeout = 0,
        nextPaint = ()=> {
          clearTimeout(repaintTimeout);
          this.playUnlockedStyle()
            .then(()=> {
              this.elements.lockscreen.hidden = true;
              this.post('unlock');
            });
        },
        waitPaint = app ? app.tryWaitForFullRepaint.bind(app, nextPaint) :
                    setTimeout.bind(this, nextPaint, 400);
    waitPaint();
    // TODO: Do real unlock. This is for demo.
    // Must handle passcode.
    //self.lockScreen.unlock();
  };

  /**
   * Change the style of the LockScreen while unlocking.
   * Since the transition is asynchrnous, this function would return
   * a promise.
   *
   * @return {Promise} - return after the transition end
   * @this {LockScreenMediator}
   * @memberof LockScreenMediator
   */
  LockScreenMediator.prototype.playUnlockedStyle =
  function lsm_playUnlockedStyle() {

    // A tricky way to solve the dilemma: tsEnd need be a reference for
    // removing it after the transitionend, and it need inside the
    // Promise constructor to get the resolver.
    var tsEnd = null;
    var promise = new window.Promise((resolver, reject) => {
      // Move to the next step.
      tsEnd = ()=>{ resolver(); };
      this.elements.lockscreen.addEventListener('transitionend',tsEnd);
      // Will trigger the unlocking animation.
      this.elements.lockscreen.classList.add('unlocked');
    });

    // A pre-defined step to clean the callback.
    promise.then(()=>{
      this.elements.lockscreen.removeEventListener('transitionend', tsEnd);
    });
    return promise;
  };

  /**
   * If the lockscreen has any state changes,
   * we would notify all widgets.
   *
   * The channel may be any channel in the router,
   * or it would be undefined which means the message is
   * fired by the mediator itself.
   *
   * @this {LockScreenMediator}
   * @memberof LockScreenMediator
   */
  LockScreenMediator.prototype.broadcast =
  function lsm_broadcast(message, channel) {
    Object.keys(this.widgets).forEach((name) => {
      this.widgets[name].notify(message, channel);
    });
  };

  /**
   * Wrapped method to broadcast the state change.
   *
   * @param {string} name - the property name of the state
   * @param {object} oldVal - any value
   * @param {object} newVal - any value
   * @this {LockScreenMediator}
   * @memberof LockScreenMediator
   */
  LockScreenMediator.prototype.broadcastStateChanged =
  function lsm_broadcastStateChanged(name, oldVal ,newVal) {
    this.broadcast({
      'type': 'stateChanged',
      'content': {
        'name': name,
        'oldVal': oldVal,
        'newVal': newVal
      }
    });
  };

  /**
   * Will launch all widgets in the default set.
   *
   * @this {LockScreenMediator}
   * @memberof LockScreenMediator
   */
  LockScreenMediator.prototype.bootstrap =
  function lsm_bootstrap() {
    this.configs.widgetset.forEach((name) => {
      this.factory.launch(name);
    });
  };

  /** @exports LockScreenMediator */
  exports.LockScreenMediator = LockScreenMediator;
})(self);
