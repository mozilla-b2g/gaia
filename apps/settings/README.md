# Settings

- Allows the user to configure device settings
- Responds to **incoming activities** ('configure'), which allows the user to navigate to a specific panel to configure from another app (eg. show the wifi settings panel if no data connection is available).

## Current Status

Currently basic settings services (mozSettings/UI bindings, panel navigation...) used by all panels and root panel specific logic were mixed and defined in a few modules (Settings, Connectivity). 

The goal is to break the panel dependency. This should be done by breaking existing modules into smaller ones, which enables each panel to load only the necessary codes. And new panels should follow the new code structure so we will achieve:

1. Module separation
2. Panel separation
3. Inline activities
4. View/logic separation

## Modules

We are using [AMD](http://en.wikipedia.org/wiki/Asynchronous_module_definition) modules, loaded using 'Alemeda' (a lighter version of [RequireJS](http://requirejs.org)) and building/optimizing using ['r.js'](http://requirejs.org/docs/optimization.html) (the RequireJS optimizer). We have dependencies on files (`shared/js`)  which aren't AMD modules. For those we use the ['shim'](http://requirejs.org/docs/api.html#config-shim) options in our [`requirejs_config.js`](js/config/require.js)

## module/settings_service.js
`SettingsService` provides a navigate function for panel navigation. It gets the corresponding panel module from `PanelCache` and call to its show and hide functions when navigating (see the module/panel.js section).

## module/panel_cache.js
`PanelCache` loads panel modules based on panel IDs and caches the loaded modules. If there is no corresponding panel module, it returns `SettingsPanel`.

## module/panel.js
`Panel` defines Six basic functions: show, hide, beforeShow, beforeHide, init, and uninit for navigation. These functions are called by `SettingsService` during the navigation.
- show:       called when the panel is navigated into the viewport
- hide:       called when the panel is navigated out of the viewport
- beforeShow: called when the panel is about to be navigated into the viewport
- beforeHide: called when the panel is about to be navigated out of the viewport
- init:       called at the first time when the beforeShow function gets called
- uninit:     called when cleanup

The internal functions, _onShow, _onHide, _onBeforeShow, _onBeforeHide, _onInit, and _onUninit, are called respectively in the basic functions. The syntax of the functions are:
```sh
  function onShow(panelElement [, showOptions])
  function onHide()
  function onBeforeShow(panelElement [, beforeShowOptions])
  function onBeforeHide()
  function onInit(panelElement [, initOptions])
  function onUninit()
```

We are able to override the internal functions by passing an option object into the constructor of `Panel`. For example,
```sh
  Panel({
    onShow: function(panelElement, showOptions) { //... },
    onHide: function() { //... },
    onBeforeShow: function(panelElement, beforeShowOptions) { //... },
    onBeforeHide: function() { //... },
    onInit: function(panelElement, initOptions) { //... },
    onUninit: function() { //... }
  })
```

Typically we can create DOM element references in onInit, update UI elements and add listeners in onShow or onBeforeShow, remove listeners in onHide, and do cleanup in onUninit. The difference between onShow and onBeforeShow is that onBeforeShow is called before the transition, which makes updating the UI before displaying it to users possible. 

Note that the transition happens right after onBeforeShow, please avoid heavy things in onBeforeShow and onBeforeHide, or it may drag down the performance of the transition.

## module/settings_panel.js
`SettingsPanel` extends `Panel` with basic settings services. It presets the UI elements based on the values in mozSettings and add listeners responding to mozSettings changes in onBeforeShow. In onInit it parses the panel element for activating links. It also removes listeners in onHide so that we can avoid unwanted UI updates when the panel is outside of the viewport.

As we are using require.js for module management, scripts used in a panel should be wrapped in an AMD module or loaded from it, and which should extends from `SettingsPanel` to have basic settings services. Similar to `Panel`, we are able override onShow, onHide, onBeforeShow, onBeforeHide, onInit, and onUninit by passing an option object to the constructor of `SettingsPanel`.

## Implement Guide
###How to create a new panel in Settings?
1. Create an HTML template file with the following format and place it in the elements/ folder.
```sh
  <element name="{panel_name}" extends="section">
    <template>
      <!-- UI elements -->
    </template>
  </element>
```

2. Add the following `link` tag in the head element of index.html.
```sh
  <link rel="import" href="{path_to_html_template}">
```

3. Add the following `section` tag in the body element of index.html.
```sh
  <section is="{panel_name}" role="region" id="{panel_id}"></section>
```

### How to load scripts for a panel?
1. Define an AMD module that extends from `SettingsPanel`. You can add other needed modules in the dependency list. A simple module looks like:
```sh
  define('panels/SamplePanel', ['modules/SettingsPanel', 'modules/Module1', 'modules/Module2'],
    function(SettingsPanel, Module1, Module2) {
      return SettingsPanel({
        onInit: function(rootElement, initOptions) {
          //...
        },
        onUninit: function() {
          //...
        },
        onShow: function(rootElement, showOptions) {
          //...
        },
        onHide: function() {
          //...
        }
      });
  });
```

2. Add a <panel> tag with a "data-path" attrbute specifying the panel module in the end of the panel template. The HTML file looks like:
```sh
  <element name="{panel_name}" extends="section">
    <template>
      <!-- UI elements -->
      <panel data-path="panels/SamplePanel"></panel>
    </template>
  </element>
```

###How to port old panel to new structure in Settings?

1. find panel href={element} in index.html

2. find panel element in element/{element}.html
replace the line
```
<script src="js/<panel name>.js"></script>
```
to
```
<panel data-path="panels/<Capital panel name>Panel"></panel>
```
for `support` panel, it denotes replace `js/support.js` to `panels/SupportPanel`.

3. create `modules/Support.js`

4. create new `panels/SupportPanel.js` and include module/Support

5. test with command for integration test
`sudo make test-integration APP=settings`

## Build step

The settings app has it's own [`Makefile`](Makefile). A Makefile is similar to Grunt, but written in bash, it is essentially a list of tasks that can be run (via `make <task-name>`). When a Gaia application has its own `apps/<app-name>/Makefile`, it will be automatically run when Gaia builds.

Our `Makefile` has two tasks, one to **'build'** and one to **'clean'** (delete the build). The build steps are as follows:

1. Remove any previous settings build from the `build_stage/`
2. Create an new directory `build_stage/settings`
3. Run the `r.js` (RequireJS optimizer), pointing it at our `require_config.jslike` file (`.jslike` because we don't want Gaia builds to mess with it [I think]). This copies our entire application (JS and all) and bundles our JS (tracing `require()` calls) and CSS (tracing `@import`) in two single files.

