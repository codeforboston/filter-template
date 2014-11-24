'use strict';
var tests = [];
for (var file in window.__karma__.files) {
  if (window.__karma__.files.hasOwnProperty(file)) {
    if (/_spec\.js$/.test(file)) {
      tests.push(file);
    }
  }
}

require.config({
  baseUrl: '/base/src/',
  paths: {
    'test': '../test',
    'jquery': '../lib/jquery-1.10.2',
    'leaflet': '../lib/leaflet/leaflet',
    'L.Control.Locate': '../lib/leaflet/L.Control.Locate',
    'leaflet.markercluster': '../lib/leaflet.markercluster/leaflet.markercluster',
    'handlebars': '../lib/handlebars',
    'lodash': '../lib/lodash.min',
    'flight': '../lib/flight.min'
  },
  shim: {
    'handlebars': {
      exports: 'Handlebars'
    },
    'underscore': {
      exports: '_'
    },
    'flight': {
      exports: 'flight'
    },
    leaflet: {
      exports: 'L'
    },
    'L.Control.Locate': ['leaflet'],
    'leaflet.markercluster': ['leaflet']
  },

  deps: tests,
  callback: window.__karma__.start
});
