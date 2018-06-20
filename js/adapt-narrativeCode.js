define([
      'core/js/adapt',
      'core/js/views/componentView',
      'core/js/libraries/highlight.pack'
  ], function(Adapt, ComponentView) {

    var NarrativeCode = ComponentView.extend({

        events: {
            'click .narrativeCode-strapline-title': 'openPopup',
            'click .narrativeCode-controls': 'onNavigationClicked',
            'click .narrativeCode-indicators .narrativeCode-progress': 'onProgressClicked'
        },

        preRender: function() {
            this.listenTo(Adapt, 'device:changed', this.reRender, this);
            this.listenTo(Adapt, 'device:resize', this.resizeControl, this);
            this.listenTo(Adapt, 'notify:closed', this.closeNotify, this);
            this.setDeviceSize();

            // Checks to see if the narrative should be reset on revisit
            this.checkIfResetOnRevisit();
        },

        setDeviceSize: function() {
            if (Adapt.device.screenSize === 'large') {
                this.$el.addClass('desktop').removeClass('mobile');
                this.model.set('_isDesktop', true);
            } else {
                this.$el.addClass('mobile').removeClass('desktop');
                this.model.set('_isDesktop', false)
            }
        },

        postRender: function() {
            this.renderState();
            this.$('.narrativeCode-slider').imageready(_.bind(function() {
                this.setReadyStatus();
                hljs.initHighlighting();
            }, this));
            this.setupNarrative();
        },

        // Used to check if the narrative should reset on revisit
        checkIfResetOnRevisit: function() {
            var isResetOnRevisit = this.model.get('_isResetOnRevisit');

            // If reset is enabled set defaults
            if (isResetOnRevisit) {
                this.model.reset(isResetOnRevisit);
                this.model.set({_stage: 0});

                _.each(this.model.get('_items'), function(item) {
                    item._isVisited = false;
                });
            }
        },

        setupNarrative: function() {
            this.setDeviceSize();
            if(!this.model.has('_items') || !this.model.get('_items').length) return;
            this.model.set('_marginDir', 'left');
            if (Adapt.config.get('_defaultDirection') == 'rtl') {
                this.model.set('_marginDir', 'right');
            }
            this.model.set('_itemCount', this.model.get('_items').length);

            this.model.set('_active', true);

            if (this.model.get('_stage')) {
                this.setStage(this.model.get('_stage'), true);
            } else {
                this.setStage(0, true);
            }
            this.calculateWidths();

            if (Adapt.device.screenSize !== 'large') {
                this.replaceInstructions();
            }
            this.setupEventListeners();
        },

        calculateWidths: function() {
            var slideWidth = this.$('.narrativeCode-slide-container').width();
            var slideCount = this.model.get('_itemCount');
            var marginRight = this.$('.narrativeCode-slider-code').css('margin-right');
            var extraMargin = marginRight === '' ? 0 : parseInt(marginRight);
            var fullSlideWidth = (slideWidth + extraMargin) * slideCount;

            this.$('.narrativeCode-slider-code').width(slideWidth);
            this.$('.narrativeCode-strapline-header').width(slideWidth);
            this.$('.narrativeCode-strapline-title').width(slideWidth);

            this.$('.narrativeCode-slider').width(fullSlideWidth);
            this.$('.narrativeCode-strapline-header-inner').width(fullSlideWidth);

            var stage = this.model.get('_stage');
            var margin = -(stage * slideWidth);

            this.$('.narrativeCode-slider').css(('margin-' + this.model.get('_marginDir')), margin);
            this.$('.narrativeCode-strapline-header-inner').css(('margin-' + this.model.get('_marginDir')), margin);

            this.model.set('_finalItemLeft', fullSlideWidth - slideWidth);
        },

        resizeControl: function() {
            var wasDesktop = this.model.get('_isDesktop');
            this.setDeviceSize();
            if (wasDesktop != this.model.get('_isDesktop')) this.replaceInstructions();
            this.calculateWidths();
            this.evaluateNavigation();
        },

        reRender: function() {
            this.resizeControl();
        },

        closeNotify: function() {
            this.evaluateCompletion()
        },

        replaceInstructions: function() {
            if (Adapt.device.screenSize === 'large') {
                this.$('.narrativeCode-instruction-inner').html(this.model.get('instruction')).a11y_text();
            } else if (this.model.get('mobileInstruction')) {
                this.$('.narrativeCode-instruction-inner').html(this.model.get('mobileInstruction')).a11y_text();
            }
        },

        moveSliderToIndex: function(itemIndex, animate, callback) {
            var extraMargin = parseInt(this.$('.narrativeCode-slider-code').css('margin-right'));
            var movementSize = this.$('.narrativeCode-slide-container').width() + extraMargin;
            var marginDir = {};
            if (animate && !Adapt.config.get('_disableAnimation')) {
                marginDir['margin-' + this.model.get('_marginDir')] = -(movementSize * itemIndex);
                this.$('.narrativeCode-slider').velocity("stop", true).velocity(marginDir);
                this.$('.narrativeCode-strapline-header-inner').velocity("stop", true).velocity(marginDir, {complete:callback});
            } else {
                marginDir['margin-' + this.model.get('_marginDir')] = -(movementSize * itemIndex);
                this.$('.narrativeCode-slider').css(marginDir);
                this.$('.narrativeCode-strapline-header-inner').css(marginDir);
                callback();
            }
        },

        setStage: function(stage, initial) {
            this.model.set('_stage', stage);
            if (this.model.get('_isDesktop')) {
                // Set the visited attribute for large screen devices
                var currentItem = this.getCurrentItem(stage);
                currentItem._isVisited = true;
            }

            this.$('.narrativeCode-progress:visible').removeClass('selected').eq(stage).addClass('selected');
            this.$('.narrativeCode-slider-code').children('.controls').a11y_cntrl_enabled(false);
            this.$('.narrativeCode-slider-code').eq(stage).children('.controls').a11y_cntrl_enabled(true);
            this.$('.narrativeCode-content-item').addClass('narrativeCode-hidden').a11y_on(false).eq(stage).removeClass('narrativeCode-hidden').a11y_on(true);
            this.$('.narrativeCode-strapline-title').a11y_cntrl_enabled(false).eq(stage).a11y_cntrl_enabled(true);

            this.evaluateNavigation();
            this.evaluateCompletion();

            this.moveSliderToIndex(stage, !initial, _.bind(function() {
                if (this.model.get('_isDesktop')) {
                    if (!initial) this.$('.narrativeCode-content-item').eq(stage).a11y_focus();
                } else {
                    if (!initial) this.$('.narrativeCode-strapline-title').a11y_focus();
                }
            }, this));
        },

        constrainStage: function(stage) {
            if (stage > this.model.get('_items').length - 1) {
                stage = this.model.get('_items').length - 1;
            } else if (stage < 0) {
                stage = 0;
            }
            return stage;
        },

        constrainXPosition: function(previousLeft, newLeft, deltaX) {
            if (newLeft > 0 && deltaX > 0) {
                newLeft = previousLeft + (deltaX / (newLeft * 0.1));
            }
            var finalItemLeft = this.model.get('_finalItemLeft');
            if (newLeft < -finalItemLeft && deltaX < 0) {
                var distance = Math.abs(newLeft + finalItemLeft);
                newLeft = previousLeft + (deltaX / (distance * 0.1));
            }
            return newLeft;
        },

        evaluateNavigation: function() {
            var currentStage = this.model.get('_stage');
            var itemCount = this.model.get('_itemCount');
            if (currentStage == 0) {
                this.$('.narrativeCode-controls').addClass('narrativeCode-hidden');

                if (itemCount > 1) {
                    this.$('.narrativeCode-control-right').removeClass('narrativeCode-hidden');
                }
            } else {
                this.$('.narrativeCode-control-left').removeClass('narrativeCode-hidden');

                if (currentStage == itemCount - 1) {
                    this.$('.narrativeCode-control-right').addClass('narrativeCode-hidden');
                } else {
                    this.$('.narrativeCode-control-right').removeClass('narrativeCode-hidden');
                }
            }

        },

        getNearestItemIndex: function() {
            var currentPosition = parseInt(this.$('.narrativeCode-slider').css('margin-left'));
            var codeWidth = this.$('.narrativeCode-slider-code').width();
            var absolutePosition = currentPosition / codeWidth;
            var stage = this.model.get('_stage');
            var relativePosition = stage - Math.abs(absolutePosition);

            if (relativePosition < -0.3) {
                stage++;
            } else if (relativePosition > 0.3) {
                stage--;
            }

            return this.constrainStage(stage);
        },

        getCurrentItem: function(index) {
            return this.model.get('_items')[index];
        },

        getVisitedItems: function() {
            return _.filter(this.model.get('_items'), function(item) {
                return item._isVisited;
            });
        },

        evaluateCompletion: function() {
            if (this.getVisitedItems().length === this.model.get('_items').length) {
                this.trigger('allItems');
            }
        },

        moveElement: function($element, deltaX) {
            var previousLeft = parseInt($element.css('margin-left'));
            var newLeft = previousLeft + deltaX;

            newLeft = this.constrainXPosition(previousLeft, newLeft, deltaX);
            $element.css(('margin-' + this.model.get('_marginDir')), newLeft + 'px');
        },

        openPopup: function(event) {
            event.preventDefault();
            var currentItem = this.getCurrentItem(this.model.get('_stage'));
            var popupObject = {
                title: currentItem.title,
                body: currentItem.body
            };

            // Set the visited attribute for small and medium screen devices
            currentItem._isVisited = true;

            Adapt.trigger('notify:popup', popupObject);
        },

        onNavigationClicked: function(event) {

            if (!this.model.get('_active')) return;

            var stage = this.model.get('_stage');
            var numberOfItems = this.model.get('_itemCount');

            if ($(event.currentTarget).hasClass('narrativeCode-control-right')) {
                stage++;
            } else if ($(event.currentTarget).hasClass('narrativeCode-control-left')) {
                stage--;
            }
            stage = (stage + numberOfItems) % numberOfItems;
            this.setStage(stage);
        },

        onProgressClicked: function(event) {
            event.preventDefault();
            var clickedIndex = $(event.target).index();
            this.setStage(clickedIndex);
        },

        inview: function(event, visible, visiblePartX, visiblePartY) {
            if (visible) {
                if (visiblePartY === 'top') {
                    this._isVisibleTop = true;
                } else if (visiblePartY === 'bottom') {
                    this._isVisibleBottom = true;
                } else {
                    this._isVisibleTop = true;
                    this._isVisibleBottom = true;
                }

                if (this._isVisibleTop && this._isVisibleBottom) {
                    this.$('.component-inner').off('inview');
                    this.setCompletionStatus();
                }

            };
        },

        onCompletion: function() {
            this.setCompletionStatus();
            if (this.completionEvent && this.completionEvent != 'inview') {
                this.off(this.completionEvent, this);
            }
        },

        setupEventListeners: function() {
            this.completionEvent = (!this.model.get('_setCompletionOn')) ? 'allItems' : this.model.get('_setCompletionOn');
            if (this.completionEvent !== 'inview' && this.model.get('_items').length > 1) {
                this.on(this.completionEvent, _.bind(this.onCompletion, this));
            } else {
                this.$('.component-widget').on('inview', _.bind(this.inview, this));
            }
        }

    });

    Adapt.register('narrativeCode', NarrativeCode);

    return NarrativeCode;

});
