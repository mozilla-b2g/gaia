# Camera

- Allows the user to **take photographs**
- Allows the user to **record videos**
- Responds to **incoming activities** ('pick'), which allow the user to capture images/video for use inside another app (eg. capturing an image to attach to an email).
- Allows the user to **review** recently taken images/videos.
- Allows the user to **share** images/videos when reviewing.
- Allows the user to **delete** images/videos when reviewing.

The camera app is very 'modular'. We have broken the codebase down into a collection of 'Views' and 'Controllers'. Below I go into more detail about the architectural decisions made, and why we made them.

## Modules

We are using [AMD](http://en.wikipedia.org/wiki/Asynchronous_module_definition) modules, loaded using 'Alemeda' (a lighter version of [RequireJS](http://requirejs.org)) and building/optimizing using ['r.js'](http://requirejs.org/docs/optimization.html) (the RequireJS optimizer). We have dependencies on files (`shared/js`)  which aren't AMD modules. For those we use the ['shim'](http://requirejs.org/docs/api.html#config-shim) options in our [`requirejs_config.js`](js/require_config.js)

## camera.js

The [camera.js](js/camera.js) module is currently an interface to the camera hardware. It also maintains a degree of state, including things like: current camera (front/back), current flash mode (auto/on/off), current capture mode (camera/video).

Before the refactor, the entire app was inside `camera.js`, so there are still remnants of things that shouldn't belong there:

- Confirm dialogs
- Device storage

Moving forward we would like to see `camera.js` broken down further into distinct parts,

- Camera acquisition/configuration
- Flash settings
- Capture
- Image processing

## Views

When we speak of 'views' we are referring to a reusable UI component that makes up part of our app. The camera app consists of the following 'views':

- [Controls](js/views/controls.js)
- [Viewfinder](js/views/viewfinder.js)
- [Focus Ring](js/views/focusring.js)
- [Overlay](js/views/overlay.js)
- [HUD](js/views/hud.js) (heads up display)
- [Filmstrip](js/filmstrip.js) (legacy)

Each view is an instantiable 'class' which extends from a [base class](js/lib/view.js). The base class provides the view with some basic methods. Because views are instantiable, we can stamp out as many as we need.

```js
var viewfinder1 = new Viewfinder();
var viewfinder2 = new Viewfinder();
var viewfinder3 = new Viewfinder();
```

Although during the life-cycle of the camera we usually only create one instance of each view, it keeps view state encapsulated and makes unit testing easy! If we wanted to write a test suite to test all the methods of the `Viewfinder` class, we can simply create a fresh instance of `Viewfinder` to work with each time.

If our views were 'singletons' (non-instantiable) they would be very difficult to unit test. Between each test we would have to be very diligent in restoring any state that may have be altered, so that we can ensure that the next test will be being run in an identical environment.

### Encapsulation

It's important that we keep our view modules clean of any 'app' code. Having app code inside view modules make them harder to test, and also limits where and how they can be used.

Imagine each view module as its own document or iframe, it can/should only operate within its own scope, emitting useful events that our app can listen to, if it so wishes.

## Controllers

Controllers have too been designed as instantiable 'classes'; which may seem strange when not looking from a TDD (Test Driven Development) perspective. This has a few benefits:

- When unit testing our controllers we can (just like views) instantiate a fresh Controller for each test. Guaranteeing a clean, consistent state for each test.
- It lays down a consistent module pattern.
- It makes state easily accessible, as `this` is always to hand.
- No methods are trapped inside module closures, so we can stub/spy them easily in our unit tests.

### The `create()` method

You may see some controllers have the following code:

```js
exports = module.exports = create;
exports.Controller = Controller;

function create(options) {
  var controller = new Controller(options);
  controller.setupStuff();
  return controller;
}
```

This can look confusing at first, so let me explain. The `create` method acts as a 'factory'. When called it will create an instance of our class, perform some init work, and return the instance. Alternatively we could put the call to `.setupStuff()` inside the constructor and export the pure constructor, but this is becomes problematic when unit testing.

Alternative:

```js
module.exports = Controller;

function Controller(options) {
  this.thing = options.thing;
  this.setupStuff();
}
```

...means you can't ever create an instance of `Controller` without `Controller.protoype.setupStuff` being run.

```js
var controller = new Controller();
this.controller.setupStuff.called; //=> true
```

Let's say I want to test `Controller.prototype.doThing()`. To test this method I need to instantiate an instance of `Controller` to work with. If within my constructor method I am running several other methods, I have already made changes to my class before we've even had a chance to test anything.

By restricting the constructor to simply managing arguments and setting up properties on the instance, what we get back is pure/untouched and ready for testing, without the overhead of stubbing out and restoring unwanted methods called inside the constructor.

## Build step

The camera app has it's own [`Makefile`](Makefile). A Makefile is similar to Grunt, but written in bash, it is essentially a list of tasks that can be run (via `make <task-name>`). When a Gaia application has its own `apps/<app-name>/Makefile`, it will be automatically run when Gaia builds.

At the root we also have [`gaia_build.json`](gaia_build.json), which tells Gaia to fetch the built app from `build_stage/camera` instead of `apps/camera`, before zipping it up to `profile/webapps/camera/application.zip`.

Our `Makefile` has two tasks, one to **'build'** and one to **'clean'** (delete the build). The build steps are as follows:

1. Remove any previous camera build from the `build_stage/`
2. Create an new directory `build_stage/camera`
3. Copy all the entire `shared/` directory into our build directory. This is so that any shared dependencies that we are using are available in `build_stage/camera/shared/`, mimicking the magically resolved `/shared/` HTTP requests in development.
4. Run the `r.js` (RequireJS optimizer), pointing it at our `require_config.jslike` file (`.jslike` because we don't want Gaia builds to mess with it [I think]). This copies our entire application (JS and all) and bundles our JS (tracing `require()` calls) and CSS (tracing `@import`) in two single files.

## Old code

The are still some modules have not been reworked into the new architecture:

- [panzoom.js](js/panzoom.js)
- [filmstrip.js](js/filmstrip.js)

As far as I know there is nothing blocking work on aligning `confirm.js` and `panzoom.js` with our new architecture. `filmstrip.js` has been touched as little as possible as plans in `1.4` propose very different funtionality. Therefore work to refactor this module would probably be discarded as `1.4` features are implemented.