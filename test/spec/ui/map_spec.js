define(
  ['leaflet', 'test/mock', 'jquery', 'lodash'], function(L, mock, $, _) {
  'use strict';
  describeComponent('ui/map', function() {
    beforeEach(function() {
      L.Icon.Default.imagePath = '/base/lib/leaflet/images';
      setupComponent();
    });

    describe('initialize', function() {
      it('sets up the map', function() {
        expect(this.component.map).toBeDefined();
      });
    });
    describe('loading data', function () {
      it('config sets up the map object', function() {
        this.component.map = jasmine.createSpyObj('Map',
                                                  ['setView',
                                                   'setMaxBounds']);
        spyOn(L.control, 'locate').andReturn(
          jasmine.createSpyObj('Locate', ['addTo']));
        this.component.map.options = {};
        this.component.trigger('config', mock.config);
        expect(this.component.map.options.maxZoom, mock.config.map.maxZoom);
        expect(this.component.map.setView).toHaveBeenCalledWith(
          mock.config.map.center, mock.config.map.zoom);
        expect(this.component.map.setMaxBounds).toHaveBeenCalledWith(
          mock.config.map.maxBounds);
        expect(L.control.locate).toHaveBeenCalledWith();
        expect(L.control.locate().addTo).toHaveBeenCalledWith(
          this.component.map);
      });

      it('data sets up the features', function() {
        this.component.trigger('data', mock.data);
        expect(_.size(this.component.attr.features)).toEqual(3);
      });

      it('data a second time resets the data', function() {
        this.component.trigger('data', {type: 'FeatureCollection',
                                        features: []});
        expect(_.size(this.component.attr.features)).toEqual(0);
      });
    });

    describe('panning', function() {
      beforeEach(function() {
        spyOn(this.component.map, 'panTo');
      });
      it('panTo goes to the lat/lng with maximum zoom', function() {
        var latlng = {lat: 1, lng: 2};
        this.component.trigger('config', mock.config);
        this.component.trigger('panTo', latlng);
        expect(this.component.map.panTo).toHaveBeenCalledWith(
          latlng);
      });
    });

    describe('clicking an icon', function() {
      var layer;
      beforeEach(function() {
        spyOnEvent(document, 'selectFeature');
        this.component.trigger('config', mock.config);
        this.component.trigger('data', mock.data);

        // fake the click event
        layer = this.component.attr.features[
          mock.data.features[0].geometry.coordinates];
        layer.fireEvent('click', {
          latlng: layer._latlng
        });
      });

      it('sends a selectFeature event', function() {
        expect('selectFeature').toHaveBeenTriggeredOnAndWith(
          document, layer.feature);
      });
    });

    describe('selectFeature', function() {
      beforeEach(function() {
        this.component.trigger('config', mock.config);
        this.component.trigger('data', mock.data);
        this.component.trigger(document,
                               'selectFeature', mock.data.features[0]);
      });
      it('turns the icon gray', function() {
        var icon = this.component.$node.find('.leaflet-marker-icon:first');
        expect(icon.attr('src')).toMatch(/marker-icon-gray\.png$/);
      });

      it('turns the previously clicked icon back to the default', function() {
        this.component.trigger(document, 'selectFeature', null);
        var icon = this.component.$node.find('.leaflet-marker-icon:first');
        expect(icon.attr('src')).toMatch(/marker-icon\.png$/);
      });

      it('leaves dragging off when not in edit mode', function() {
        var feature = mock.data.features[0];
        var marker = this.component.attr.features[feature.geometry.coordinates];
        expect(!marker.dragging._enabled).toBe(true);
      });
    });

    describe('deselectFeature', function() {
      beforeEach(function() {
        this.component.trigger('config', mock.config);
        this.component.trigger('data', mock.data);
        this.component.trigger(document,
                               'selectFeature', mock.data.features[0]);
      });
      it('turns the icon back to default', function() {
        this.component.trigger(document, 'deselectFeature', mock.data.features[0]);
        var icon = this.component.$node.find('.leaflet-marker-icon:first');
        expect(icon.attr('src')).toMatch(/marker-icon\.png$/);
      });

    });

    describe('in edit mode', function() {
      var layer;
      beforeEach(function() {

        // Initialize with deep copies of mock config & data, so we
        // don't have to worry about scribbling on the originals.
        //
        // Also, set 'edit_mode' to true in the mock config.

        this.component.trigger('config', $.extend(true, {}, mock.config,
                                                  {edit_mode: true}));
        this.mockData = $.extend(true, {}, mock.data);
        this.component.trigger('data', this.mockData);
      });

      describe('with a feature', function() {

        beforeEach(function() {
          this.feature = this.mockData.features[0];
          this.marker = this.component.attr.features[this.feature.geometry.coordinates];
        });

        // For some reason, spies on this.marker.dragging.{enable,disable}
        // don't work, so...

        it('enables dragging on select', function() {
          this.component.trigger(document, 'selectFeature', this.feature);
          expect(this.marker.dragging._enabled).toBe(true);
        });
        
        it('disables dragging on deselect', function() {
          this.component.trigger(document, 'selectFeature', this.feature);
          this.component.trigger(document, 'deselectFeature', this.feature);
          expect(!this.marker.dragging._enabled).toBe(true);
        });

        it('resets position on external posn change', function() {
          this.component.trigger(document, 'selectFeature', this.feature);
          var newPos = {lat: 33, lng: 44};

          spyOn(this.marker, 'setLatLng');
          this.component.trigger(document, 'selectedFeatureMoved', newPos);
          expect(this.marker.setLatLng).toHaveBeenCalledWith(newPos);
        });
        
        it("doesn't reset posn unless 'move' event actually moved", function() {
          this.component.trigger(document, 'selectFeature', this.feature);
          var oldLatLng = this.marker.getLatLng();
          var newPos = {lat: oldLatLng.lat, lng: oldLatLng.lng};

          spyOn(this.marker, 'setLatLng');
          this.component.trigger(document, 'selectedFeatureMoved', newPos);
          expect(this.marker.setLatLng).not.toHaveBeenCalled();
        });
        
        it('reports new position on drag-end', function() {
          spyOnEvent(document, 'selectedFeatureMoved');
          this.component.trigger(document, 'selectFeature', this.feature);
          this.marker.fireEvent('dragend');
          expect('selectedFeatureMoved').toHaveBeenTriggeredOnAndWith(
            document, this.marker.getLatLng());
        });

      });

    });

  });
});
