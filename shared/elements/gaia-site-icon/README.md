# gaia-app-icon

> A web component to show an icon for an application.

## Basic usage

With web components enabled, source the script and add a gaia-app-icon element to your document, like so:

```html
<head>
  <script src="gaia-app-icon/script.js"></script>
  <script>
    var gaiaAppIcon = document.createElement('gaia-app-icon');
    document.body.appendChild(gaiaAppIcon);
  </script>
</head>
```

## API

### Properties

#### gaiaAppIcon.app

#### gaiaAppIcon.entryPoint

#### gaiaAppIcon.bookmark

#### gaiaAppIcon.icon

### Methods

#### gaiaAppIcon.launch()

#### gaiaAppIcon.refresh()

### Events

#### icon-loaded
