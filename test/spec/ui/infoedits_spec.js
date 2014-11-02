define(['jquery', 'test/mock', 'lodash'], 
       function($, mock, _) {

  'use strict';
  describeComponent('ui/infoedits', function() {
    beforeEach(function() {
      setupComponent('<div><button class="close"/></div>');
    });

    describe('with edit-mode disabled', function() {
      it('does nothing on selectFeature', function() {
        spyOn(this.component, 'startEditing');
        $(document).trigger('config', mock.config);
        $(document).trigger('selectFeature', mock.data.features[0]);
        expect(this.component.startEditing).not.toHaveBeenCalled();
      });
    });

    describe('on close click', function() {
      it('hides the popup', function() {
        spyOn(this.$node, 'hide');
        this.$node.find('.close').click();
        expect(this.$node.hide).toHaveBeenCalledWith();
      });
    });

    describe('in edit mode', function() {
      beforeEach(function() {

        var editConfig = _.cloneDeep(mock.config);
        editConfig.edit_mode = true;
        $(document).trigger('config', editConfig);

        this.feature = mock.data.features[0];
      });

      // Ideally, would also be testing the behavior of the JSONEditor
      // object itself, but hard to do that without tickling its innards...

      it('creates an editor on select feature', function() {
        $(document).trigger('selectFeature', this.feature);
        expect(this.component.currentEditor).not.toBe(undefined);
      });

      it('adds the delete button', function() {
        $(document).trigger('selectFeature', this.feature);
        expect(this.$node.find(".btn-delete").size()).toBe(1);
      });

      describe('delete button with undeleted feature', function() {
        beforeEach(function() {
          $(document).trigger('selectFeature', this.feature);
        });
        it('has text "delete"', function() {
          expect(this.$node.find(".btn-delete").text()).toBe("Delete");
        });
        it('sends selectedFeatureDeleted when clicked', function() {
          spyOnEvent(document, 'selectedFeatureDeleted');
          this.$node.find(".btn-delete").click();
          expect('selectedFeatureDeleted').toHaveBeenTriggeredOn(document);
        });
      });

      describe('delete button with deleted feature', function() {
        beforeEach(function() {
          this.feature.deleted = true;
          $(document).trigger('selectFeature', this.feature);
        });
        afterEach(function() {
          this.feature.deleted = false;
        });
        it('has text "restore"', function() {
          expect(this.$node.find(".btn-delete").text()).toBe("Restore");
        });
        it('sends selectedFeatureUndeleted when clicked', function() {
          spyOnEvent(document, 'selectedFeatureUndeleted');
          this.$node.find(".btn-delete").click();
          expect('selectedFeatureUndeleted').toHaveBeenTriggeredOn(document);
        });
      });

      it('destroys the editor on close click', function() {
        $(document).trigger('selectFeature', this.feature);
        this.$node.find('.close').click();
        expect(this.component.currentEditor).toBe(undefined);
      });
    });

  });
});
