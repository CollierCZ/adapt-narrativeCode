define([
    'core/js/adapt',
    'core/js/views/componentView',
    'core/js/libraries/prism'
], function(Adapt, ComponentView) {
    'use strict';

    var NarrativeCodeView = ComponentView.extend({

        _isInitial: true,

        events: {
            'click .narrativeCode-strapline-title': 'openPopup',
            'click .narrativeCode-controls': 'onNavigationClicked',
            'click .narrativeCode-indicators .narrativeCode-progress': 'onProgressClicked'
        },

        preRender: function() {
            this.listenTo(Adapt, {
                'device:changed': this.reRender,
                'device:resize': this.resizeControl,
                'notify:closed': this.closeNotify
            });
            this.setDeviceSize();

            this.listenTo(this.model.get('_children'), {
                'change:_isActive': this.onItemsActiveChange,
                'change:_isVisited': this.onItemsVisitedChange
            });

            this.checkIfResetOnRevisit();
            this.calculateWidths();
        },

        onItemsActiveChange: function(item, _isActive) {
            if (_isActive === true) {
                this.setStage(item);
            }
        },

        onItemsVisitedChange: function(item, isVisited) {
            if (!isVisited) return;
            this.$('[data-index="' + item.get('_index') + '"]').addClass('visited');
        },

        setDeviceSize: function() {
            this.model.set('_isDesktop', Adapt.device.screenSize === 'large');
        },

        postRender: function() {
            this.renderState();
            this.$('.narrativeCode-slider').imageready(this.setReadyStatus.bind(this));
            Prism.highlightAll();
            this.setupNarrativeCode();

            if (Adapt.config.get('_disableAnimation')) {
                this.$el.addClass('disable-animation');
            }
        },

        checkIfResetOnRevisit: function() {
            var isResetOnRevisit = this.model.get('_isResetOnRevisit');
            // If reset is enabled set defaults
            if (isResetOnRevisit) {
                this.model.reset(isResetOnRevisit);
            }
        },

        setupNarrativeCode: function() {
            this.setDeviceSize();
            var items = this.model.get('_children');
            if (!items || !items.length) return;

            var activeItem = this.model.getActiveItem();
            if (!activeItem) {
                activeItem = this.model.getItem(0);
                activeItem.toggleActive(true);
            } else {
                // manually trigger change as it is not fired on reentry
                items.trigger('change:_isActive', activeItem, true);
            }

            this.calculateWidths();

            if (Adapt.device.screenSize !== 'large') {
                this.replaceInstructions();
            }
            this.setupEventListeners();
            this._isInitial = false;
        },

        calculateWidths: function() {
            var itemCount = this.model.get('_children').length;
            this.model.set({
                '_totalWidth': (100 * itemCount) + itemCount,
                '_itemWidth': 100 / itemCount
            });
        },

        resizeControl: function() {
            var wasDesktop = this.model.get('_isDesktop');
            this.setDeviceSize();
            if (wasDesktop != this.model.get('_isDesktop')) this.replaceInstructions();
            this.evaluateNavigation();
            var activeItem = this.model.getActiveItem();
            if (activeItem) this.setStage(activeItem);
        },

        reRender: function() {
            this.resizeControl();
        },

        closeNotify: function() {
            this.evaluateCompletion();
        },

        replaceInstructions: function() {
            if (Adapt.device.screenSize === 'large') {
                this.$('.narrativeCode-instruction-inner').html(this.model.get('instruction')).a11y_text();
            } else if (this.model.get('mobileInstruction')) {
                this.$('.narrativeCode-instruction-inner').html(this.model.get('mobileInstruction')).a11y_text();
            }
        },

        moveSliderToIndex: function(itemIndex, shouldAnimate) {
            var offset = this.model.get('_itemWidth') * itemIndex;
            if (Adapt.config.get('_defaultDirection') === 'ltr') {
                offset *= -1;
            }
            var cssValue = 'translateX('+offset+'%)';
            var $sliderElm = this.$('.narrativeCode-slider');
            var $straplineHeaderElm = this.$('.narrativeCode-strapline-header-inner');

            $sliderElm.css('transform', cssValue);
            $straplineHeaderElm.css('transform', cssValue);

            if (Adapt.config.get('_disableAnimation')) {
                this.onTransitionEnd();
            } else {
                $sliderElm.one('transitionend', this.onTransitionEnd.bind(this));
            }
        },

        onTransitionEnd: function() {
            if (this._isInitial) return;

            var index = this.model.getActiveItem().get('_index');
            if (this.model.get('_isDesktop')) {
                this.$('.narrativeCode-content-item[data-index="'+index+'"]').a11y_focus();
            } else {
                this.$('.narrativeCode-strapline-title').a11y_focus();
            }
        },

        setStage: function(item) {
            var index = item.get('_index');
            if (this.model.get('_isDesktop')) {
                // Set the visited attribute for large screen devices
                item.toggleVisited(true);
            }

            var $slideGraphics = this.$('.narrativeCode-slider-graphic');
            this.$('.narrativeCode-progress:visible').removeClass('selected').filter('[data-index="'+index+'"]').addClass('selected');
            $slideGraphics.children('.controls').a11y_cntrl_enabled(false);
            $slideGraphics.filter('[data-index="'+index+'"]').children('.controls').a11y_cntrl_enabled(true);
            this.$('.narrativeCode-content-item').addClass('narrativeCode-hidden').a11y_on(false).filter('[data-index="'+index+'"]').removeClass('narrativeCode-hidden').a11y_on(true);
            this.$('.narrativeCode-strapline-title').a11y_cntrl_enabled(false).filter('[data-index="'+index+'"]').a11y_cntrl_enabled(true);

            this.evaluateNavigation();
            this.evaluateCompletion();
            this.moveSliderToIndex(index, !this._isInitial);
        },

        evaluateNavigation: function() {
            var active = this.model.getActiveItem();
            if (!active) return;

            var currentStage = active.get('_index');
            var itemCount = this.model.get('_children').length;

            var isAtStart = currentStage === 0;
            var isAtEnd = currentStage === itemCount - 1;

            this.$('.narrativeCode-control-left').toggleClass('narrativeCode-hidden', isAtStart);
            this.$('.narrativeCode-control-right').toggleClass('narrativeCode-hidden', isAtEnd);
        },

        evaluateCompletion: function() {
            if (this.model.areAllItemsCompleted()) {
                this.trigger('allItems');
            }
        },

        openPopup: function(event) {
            event && event.preventDefault();

            var currentItem = this.model.getActiveItem();

            // Set the visited attribute for small and medium screen devices
            currentItem.toggleVisited(true);

            Adapt.trigger('notify:popup', {
                title: currentItem.get('title'),
                body: currentItem.get('body')
            });
        },

        onNavigationClicked: function(event) {
            var stage = this.model.getActiveItem().get('_index');
            var numberOfItems = this.model.get('_children').length;

            if ($(event.currentTarget).hasClass('narrativeCode-control-right')) {
                this.model.setActiveItem(++stage);
            } else if ($(event.currentTarget).hasClass('narrativeCode-control-left')) {
                this.model.setActiveItem(--stage);
            }
        },

        onProgressClicked: function(event) {
            event && event.preventDefault();
            var clickedIndex = $(event.target).data('index');
            this.model.setActiveItem(clickedIndex);
        },

        inview: function(event, visible, visiblePartX, visiblePartY) {
            if (!visible) return;

            if (visiblePartY === 'top') {
                this._isVisibleTop = true;
            } else if (visiblePartY === 'bottom') {
                this._isVisibleBottom = true;
            } else {
                this._isVisibleTop = true;
                this._isVisibleBottom = true;
            }

            var wasAllInview = (this._isVisibleTop && this._isVisibleBottom);
            if (!wasAllInview) return;

            this.$('.component-inner').off('inview');
            this.setCompletionStatus();
        },

        setupEventListeners: function() {
            if (this.model.get('_setCompletionOn') === 'inview') {
                this.$('.component-widget').on('inview', this.inview.bind(this));
            }
        },

        remove: function() {
            if (this.model.get('_setCompletionOn') === 'inview') {
                this.$('.component-widget').off('inview');
            }
            ComponentView.prototype.remove.apply(this, arguments);
        }

    });

    return NarrativeCodeView;

});
