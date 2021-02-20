define([
  'core/js/adapt',
  'core/js/views/componentView',
  './modeEnum',
  'core/libraries/prism'
], function(Adapt, ComponentView, MODE) {

  class NarrativeCodeView extends ComponentView {

    events() {
      return {
        'click .js-narrativeCode-strapline-open-popup': 'openPopup',
        'click .js-narrativeCode-controls-click': 'onNavigationClicked',
        'click .js-narrativeCode-progress-click': 'onProgressClicked'
      };
    }

    initialize(...args) {
      super.initialize(...args);

      this._isInitial = true;
    }

    preRender() {
      this.listenTo(Adapt, {
        'device:changed device:resize': this.reRender,
        'notify:closed': this.closeNotify
      });
      this.renderMode();

      this.listenTo(this.model.getChildren(), {
        'change:_isActive': this.onItemsActiveChange,
        'change:_isVisited': this.onItemsVisitedChange
      });

      this.checkIfResetOnRevisit();
      this.calculateWidths();
    }

    onItemsActiveChange(item, _isActive) {
      if (!_isActive) return;
      this.setStage(item);
    }

    onItemsVisitedChange(item, _isVisited) {
      if (!_isVisited) return;
      this.$(`[data-index="${item.get('_index')}"]`).addClass('is-visited');
    }

    calculateMode() {
      const mode = Adapt.device.screenSize === 'large' ? MODE.LARGE : MODE.SMALL;
      this.model.set('_mode', mode);
    }

    renderMode() {
      this.calculateMode();

      const isLargeMode = this.isLargeMode();
      this.$el.toggleClass('mode-large', isLargeMode).toggleClass('mode-small', !isLargeMode);
    }

    isLargeMode() {
      return this.model.get('_mode') === MODE.LARGE;
    }

    postRender() {
      this.renderMode();
      this.setupNarrativeCode();

      this.$('.narrativeCode__slider').imageready(this.setReadyStatus.bind(this));

      window.Prism.highlightAll()

      if (Adapt.config.get('_disableAnimation')) {
        this.$el.addClass('disable-animation');
      }
    }

    checkIfResetOnRevisit() {
      const isResetOnRevisit = this.model.get('_isResetOnRevisit');
      // If reset is enabled set defaults
      if (isResetOnRevisit) {
        this.model.reset(isResetOnRevisit);
      }
    }

    setupNarrativeCode() {
      this.renderMode();
      const items = this.model.getChildren();
      if (!items || !items.length) return;

      let activeItem = this.model.getActiveItem();
      if (!activeItem) {
        activeItem = this.model.getItem(0);
        activeItem.toggleActive(true);
      } else {
        // manually trigger change as it is not fired on reentry
        items.trigger('change:_isActive', activeItem, true);
      }

      this.calculateWidths();

      if (!this.isLargeMode() && !this.model.get('_wasHotgraphic')) {
        this.replaceInstructions();
      }
      this.setupEventListeners();
      this._isInitial = false;
    }

    calculateWidths() {
      const itemCount = this.model.getChildren().length;
      this.model.set({
        _totalWidth: 100 * itemCount,
        _itemWidth: 100 / itemCount
      });
    }

    resizeControl() {
      const previousMode = this.model.get('_mode');
      this.renderMode();
      if (previousMode !== this.model.get('_mode')) this.replaceInstructions();
      this.evaluateNavigation();
      const activeItem = this.model.getActiveItem();
      if (activeItem) this.setStage(activeItem);
    }

    reRender() {
      if (this.model.get('_wasHotgraphic') && this.isLargeMode()) {
        this.replaceWithHotgraphic();
        return;
      }
      this.resizeControl();
    }

    closeNotify() {
      this.evaluateCompletion();
    }

    replaceInstructions() {
      if (this.isLargeMode()) {
        this.$('.narrativeCode__instruction-inner').html(this.model.get('instruction'));
        return;
      }

      if (this.model.get('mobileInstruction') && !this.model.get('_wasHotgraphic')) {
        this.$('.narrativeCode__instruction-inner').html(this.model.get('mobileInstruction'));
      }
    }

    replaceWithHotgraphic() {
      const HotgraphicView = Adapt.getViewClass('hotgraphic');
      if (!HotgraphicView) return;

      const model = this.prepareHotgraphicModel();
      const newHotgraphic = new HotgraphicView({ model });

      this.$el.parents('.component__container').append(newHotgraphic.$el);
      this.remove();
      _.defer(() => {
        Adapt.trigger('device:resize');
      });
    }

    prepareHotgraphicModel() {
      const model = this.model;
      model.resetActiveItems();
      model.set({
        _isPopupOpen: false,
        _component: 'hotgraphic',
        body: model.get('originalBody'),
        instruction: model.get('originalInstruction')
      });

      return model;
    }

    moveSliderToIndex(itemIndex) {
      let offset = this.model.get('_itemWidth') * itemIndex;
      if (Adapt.config.get('_defaultDirection') === 'ltr') {
        offset *= -1;
      }
      const cssValue = `translateX(${offset}%)`;
      const $sliderElm = this.$('.narrativeCode__slider');
      const $straplineHeaderElm = this.$('.narrativeCode__strapline-header-inner');

      $sliderElm.css('transform', cssValue);
      $straplineHeaderElm.css('transform', cssValue);

      if (this._isInitial) return;

      const hasStraplineTransition = !this.isLargeMode() && ($straplineHeaderElm.css('transitionDuration') !== '0s');
      if (hasStraplineTransition) {
        $straplineHeaderElm.one('transitionend', () => {
          this.focusOnNarrativeCodeElement(itemIndex);
        });
        return;
      }

      this.focusOnNarrativeCodeElement(itemIndex);
    }

    focusOnNarrativeCodeElement(itemIndex) {
      const dataIndexAttr = `[data-index='${itemIndex}']`;
      const $elementToFocus = this.isLargeMode() ?
        this.$(`.narrativeCode__content-item${dataIndexAttr}`) :
        this.$(`.narrativeCode__strapline-btn${dataIndexAttr}`);
      Adapt.a11y.focusFirst($elementToFocus);
    }

    setStage(item) {
      const index = item.get('_index');
      const indexSelector = `[data-index="${index}"]`;

      if (this.isLargeMode()) {
        // Set the visited attribute for large screen devices
        item.toggleVisited(true);
      }

      this.$('.narrativeCode__progress').removeClass('is-selected').filter(indexSelector).addClass('is-selected');

      const $slideGraphics = this.$('.narrativeCode__slider-image-container');
      Adapt.a11y.toggleAccessibleEnabled($slideGraphics.children('.controls'), false);
      Adapt.a11y.toggleAccessibleEnabled($slideGraphics.filter(indexSelector).children('.controls'), true);

      const $narrativeCodeItems = this.$('.narrativeCode__content-item');
      $narrativeCodeItems.addClass('u-visibility-hidden u-display-none');
      Adapt.a11y.toggleAccessible($narrativeCodeItems, false);
      Adapt.a11y.toggleAccessible($narrativeCodeItems.filter(indexSelector).removeClass('u-visibility-hidden u-display-none'), true);

      const $narrativeCodeStraplineButtons = this.$('.narrativeCode__strapline-btn');
      Adapt.a11y.toggleAccessibleEnabled($narrativeCodeStraplineButtons, false);
      Adapt.a11y.toggleAccessibleEnabled($narrativeCodeStraplineButtons.filter(indexSelector), true);

      this.evaluateNavigation();
      this.evaluateCompletion();
      this.moveSliderToIndex(index);
    }

    evaluateNavigation() {
      const active = this.model.getActiveItem();
      if (!active) return;

      const index = active.get('_index');
      const itemCount = this.model.getChildren().length;

      const isAtStart = index === 0;
      const isAtEnd = index === itemCount - 1;

      const $left = this.$('.narrativeCode__controls-left');
      const $right = this.$('.narrativeCode__controls-right');

      const globals = Adapt.course.get('_globals');

      const ariaLabelsGlobals = globals._accessibility._ariaLabels;
      const narrativeCodeGlobals = globals._components._narrativeCode;

      const ariaLabelPrevious = narrativeCodeGlobals.previous || ariaLabelsGlobals.previous;
      const ariaLabelNext = narrativeCodeGlobals.next || ariaLabelsGlobals.next;

      const prevTitle = isAtStart ? '' : this.model.getItem(index - 1).get('title');
      const nextTitle = isAtEnd ? '' : this.model.getItem(index + 1).get('title');

      $left.toggleClass('u-visibility-hidden', isAtStart);
      $right.toggleClass('u-visibility-hidden', isAtEnd);

      $left.attr('aria-label', Handlebars.compile(ariaLabelPrevious)({
        title: prevTitle,
        _globals: globals,
        itemNumber: isAtStart ? null : index,
        totalItems: itemCount
      }));
      $right.attr('aria-label', Handlebars.compile(ariaLabelNext)({
        title: nextTitle,
        _globals: globals,
        itemNumber: isAtEnd ? null : index + 2,
        totalItems: itemCount
      }));
    }

    evaluateCompletion() {
      if (this.model.areAllItemsCompleted()) {
        this.trigger('allItems');
      }
    }

    openPopup() {
      const currentItem = this.model.getActiveItem();
      Adapt.notify.popup({
        title: currentItem.get('title'),
        body: currentItem.get('body')
      });

      Adapt.on('popup:opened', function() {
        // Set the visited attribute for small and medium screen devices
        currentItem.toggleVisited(true);
      });
    }

    onNavigationClicked(event) {
      const $btn = $(event.currentTarget);
      let index = this.model.getActiveItem().get('_index');
      $btn.data('direction') === 'right' ? index++ : index--;
      this.model.setActiveItem(index);
    }

    onProgressClicked(event) {
      const index = $(event.target).data('index');
      this.model.setActiveItem(index);
    }

    setupEventListeners() {
      if (this.model.get('_setCompletionOn') === 'inview') {
        this.setupInviewCompletion('.component__widget');
      }
    }

  }

  NarrativeCodeView.template = 'narrativeCode';

  return NarrativeCodeView;

});
