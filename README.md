# SVG Overlays for Google Maps Using Raphael.js

![](https://github.com/connor11528/google-maps-svg-custom-overlay.git)

This project serves as a proof of concept for embedding arbitrary SVG interactivity
within Google Maps.

Clone the repo, run `npm install` and then open index.html. No need to serve it
over http, reading off the filesystem works fine.

You will see a stylized map of San Francisco with a handful of markers indicating
bus stops that are retrieved from the google places API. These markers are
interactive SVG elements created with Raphael.js within a custom google maps
OverlayView. Mousing over the markers (pinkish white dots) will animate the
marker label and display the bus stop location. This is not a capability Google
Maps provided, though since 3.3 release it does include support for drawing shapes.
