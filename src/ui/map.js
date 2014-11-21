define(function(require, exports, module) {
  'use strict';
  var flight = require('flight');
  var $ = require('jquery');
  var L = require('leaflet');
  require('L.Control.Locate');
  module.exports = flight.component(function map() {
    this.defaultAttrs({
      tileUrl: 'http://a{s}.acetate.geoiq.com/tiles/acetate-hillshading/{z}/{x}/{y}.png',
      tileAttribution: '&copy;2012 Esri & Stamen, Data from OSM and Natural Earth',
      tileSubdomains: '0123',
      tileMinZoom: 2,
      tileMaxZoom: 18
    });

    this.defineIconStyles = function() {
      // define icon styles
      var path = L.Icon.Default.imagePath;
      if (!path) {
        path = L.Icon.Default.imagePath = 'lib/leaflet/images';
      }
      this.grayIcon = L.icon({
        iconUrl: path + '/marker-icon-gray.png',
        shadowUrl: path + '/marker-shadow.png'
      });

      this.defaultIcon = L.icon({
        iconUrl: path + '/marker-icon.png',
        shadowUrl: path + '/marker-shadow.png'
      });
    };

    this.configureMap = function(ev, config) {
      var mapConfig = config.map;
      this.map.setView(mapConfig.center, mapConfig.zoom);
      if (mapConfig.maxZoom){
        this.map.options.maxZoom = mapConfig.maxZoom;
      }
      if (mapConfig.maxBounds){
        this.map.setMaxBounds(mapConfig.maxBounds);
      }

      // Add the location control which will zoom to current
      // location
      L.control.locate().addTo(this.map);

      // set feature attribute to be used as preview text to config
      this.featurePreviewAttr = config.map.preview_attribute;
      this.newPointAddrAttr = config.map.new_point_address_attribute;

      // Determine whether edit-mode features are enabled (particularly
      // dragging selected feature).
      this.edit_mode = config.edit_mode;

      if (this.edit_mode) {
        var label = config.new_feature_popup_label;
        if (label !== undefined) {
          $("#new-feature-popup-label").html(label);
        }
      }

    };

    this.loadData = function(ev, data) {
      this.defineIconStyles();

      var setupFeature = function(feature, layer) {
        this.attr.features[feature.geometry.coordinates] = layer;

        // bind popup to feature with specified preview attribute
        this.bindPopupToFeature(
          layer,
          feature.properties[this.featurePreviewAttr]);

        layer.on({
          click: this.emitClick.bind(this),
          mouseover: this.emitHover.bind(this),
          mouseout: this.clearHover.bind(this)
        });
      }.bind(this);

      if (this.attr.layer) {
        this.attr.features = {};
        this.map.removeLayer(this.attr.layer);
      }

      this.attr.layer = L.geoJson(data, {onEachFeature: setupFeature});
      this.attr.layer.addTo(this.map);

      if (this.edit_mode) {
        this.map.doubleClickZoom.disable();
        this.map.on('dblclick', this.emitStartCreate.bind(this));
      }
    };

    this.emitClick = function(e) {
      this.trigger(document, 'selectFeature', e.target.feature);
    };

    this.emitHover = function(e) {
      this.trigger(document, 'hoverFeature', e.target.feature);
    };

    this.clearHover = function(e) {
      this.trigger(document, 'clearHoverFeature', e.target.feature);
    };

    this.emitStartCreate = function(e) {
      this.trigger(document, 'startCreateFeature',
                   { position: e.latlng, attrs: {} });
    };

    this.selectFeature = function(ev, feature) {
      if (this.previouslyClicked) {
        this.previouslyClicked.dragging.disable();
        this.previouslyClicked.setIcon(this.defaultIcon);
        this.trigger(document, 'deselectFeature', this.currentFeature);
      }
      if (feature) {
        this.currentFeature = feature;
        var layer = this.attr.features[feature.geometry.coordinates];
        layer.setIcon(this.grayIcon);
        this.previouslyClicked = layer;

        if (this.edit_mode) {
          layer.dragging.enable();
          layer.on("dragend", function(ev) {
            var latlng = ev.target.getLatLng();
            var pos = [latlng.lng, latlng.lat];
            this.attr.features[pos] = layer;
            this.trigger(document, 'selectedFeatureMoved', [pos]);
          }.bind(this));
        }

        // re-bind popup to feature with specified preview attribute
        this.bindPopupToFeature(
          layer,
          feature.properties[this.featurePreviewAttr]);

        this.trigger('panTo', {lng: feature.geometry.coordinates[0],
                               lat: feature.geometry.coordinates[1]});
      } else {
        this.previouslyClicked = null;
      }
    };

    this.selectedFeatureMoved = function(ev, pos) {
      if (this.previouslyClicked) {
        var oldLatLng = this.previouslyClicked.getLatLng();
        if (oldLatLng.lat !== pos[1] || oldLatLng.lng !== pos[0]) {
          var latlng = L.latLng(pos[1], pos[0]);
          this.previouslyClicked.setLatLng(latlng);
          this.map.panTo(latlng);
        }
      }
    };

    this.deselectFeature = function(ev, feature) {
      if (this.previouslyClicked) {
        this.previouslyClicked.dragging.disable();
        this.previouslyClicked.setIcon(this.defaultIcon);
      }
      var layer = this.attr.features[feature.geometry.coordinates];
      // re-bind popup to feature with specified preview attribute
      // NB if value of preview attr has changed in edit, this is
      // where the map picks it up.
      this.bindPopupToFeature(
        layer,
        feature.properties[this.featurePreviewAttr]);
      this.previouslyClicked = null;
    };

    this.markDeletion = function() {
      if (this.previouslyClicked) {
        this.previouslyClicked.setOpacity(0.4);
      }
    };

    this.markUndeletion = function() {
      if (this.previouslyClicked) {
        this.previouslyClicked.setOpacity(1.0);
      }
    };

    this.bindPopupToFeature = function(layer, feature){
      layer.bindPopup(
        feature,
        {
          closeButton: false,
          offset: L.point(0, -40)
        });
    };

    this.hoverFeature = function(ev, feature) {
      if (feature) {
        var layer = this.attr.features[feature.geometry.coordinates];
        layer.openPopup();
      }
    };

    this.clearHoverFeature = function(ev, feature) {
      if (feature) {
        var layer = this.attr.features[feature.geometry.coordinates];
        layer.closePopup();
      }
    };

    this.panTo = function(ev, latlng) {
      this.map.panTo(latlng);
    };

    // Managing the two-step process of creating a new feature.
    // (It's two steps, with the simple form in a popup, so stray
    // double-clicks are easy to undo.)

    // Start create: sets up the "new-feature" popup at the right location.

    this.startCreate = function(e, data) {
      var popup = L.popup();
      this.createPopup = popup;
      this.createAddress = data.address;
      popup.setLatLng(data.position);
      popup.setContent($("#new-feature-popup").html());
      popup.openOn(this.map);

      var form = this.$node.find('.create-feature-popup-form');
      form.on('submit', this.finishCreate.bind(this));
      form.find('input').first().focus();
    };

    // Finish create: handles ordinary submission of the form in the
    // "startCreate" popup.

    this.finishCreate = function(e) {
      e.preventDefault();

      var popup = this.createPopup; // stashed away in step 1 above
      if (popup === undefined) {
        // Ordinarily "can't happen", but the test framework leaves old
        // map components lying around.  The finishCreate tests only create
        // a mock popup on the one set up for them, and we need to keep
        // the others from blowing up.  (All due to the use of a 'live'
        // event handler declaration below.)
        return;
      }

      var latlng = popup.getLatLng();

      var props = {};
      props[this.featurePreviewAttr] = $(e.target).serializeArray()[0].value;
      if (this.newPointAddrAttr) {
        props[this.newPointAddrAttr] = this.createAddress;
      }

      var feature = {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [latlng.lng, latlng.lat]
        },
        properties: props
      };

      this.lastCreatedFeature = feature; // for tests (only! no other use!)

      this.map.removeLayer(popup); // don't need it any longer...
      $(document).trigger('newFeature', feature);
      $(document).trigger('selectFeature', feature);
    };

    this.handleNewFeature = function(e, feature) {
      this.attr.layer.addData(feature);
    };

    this.after('initialize', function() {
      this.map = L.map(this.node, {});

      this.attr.features = {};

      L.tileLayer(this.attr.tileUrl, {
        attribution: this.attr.tileAttribution,
        subdomains: this.attr.tileSubdomains,
        minZoom: this.attr.tileMinZoom,
        maxZoom: this.attr.tileMaxZoom
      }).addTo(this.map);

      this.on(document, 'config', this.configureMap);
      this.on(document, 'data', this.loadData);
      this.on(document, 'dataFiltered', this.loadData);

      this.on(document, 'selectFeature', this.selectFeature);
      this.on(document, 'deselectFeature', this.deselectFeature);
      this.on(document, 'hoverFeature', this.hoverFeature);
      this.on(document, 'clearHoverFeature', this.clearHoverFeature);
      this.on(document, 'selectedFeatureMoved', this.selectedFeatureMoved);
      this.on(document, 'selectedFeatureDeleted', this.markDeletion);
      this.on(document, 'selectedFeatureUndeleted', this.markUndeletion);
      this.on(document, 'startCreateFeature', this.startCreate);
      this.on(document, 'newFeature', this.handleNewFeature);
      this.on('panTo', this.panTo);
    });
  });
});
