define([
  "core/js/adapt",
  "./narrativeCodeView",
  "core/js/models/itemsComponentModel",
], function (Adapt, NarrativeCodeView, ItemsComponentModel) {
  return Adapt.register("narrativeCode", {
    model: ItemsComponentModel.extend({}),
    view: NarrativeCodeView,
  });
});
