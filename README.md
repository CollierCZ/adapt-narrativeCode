# adapt-narrativeCode
A fork of the [Narrative component](https://github.com/adaptlearning/adapt-contrib-narrative/) for the [Adapt framework](https://github.com/adaptlearning/adapt_framework) to display highlighted code blocks.


**Narrative Code** is a *presentation component* for the Adapt framework.  

**Narrative Code** displays items (or slides) that present highlighted code side-by-side with text. Left and right navigation controls allow the learner to progress horizontally through the items. Optional text may precede it. Useful for detailing a sequential process of building code. On mobile devices, the narrative text is collapsed above the image.

[Visit the **Narrative** wiki](https://github.com/adaptlearning/adapt-contrib-narrative/wiki) for more information about its functionality and for explanations of key properties.

## Installation

### Installing Narrative Code
With the [Adapt CLI](https://github.com/adaptlearning/adapt-cli) installed, run the following from the command line:  
`adapt install adapt-narrativeCode`

Alternatively, this component can also be installed by adding the following line of code to the *adapt.json* file:  
`"adapt-narrativeCode": "*"`  
Then running the command:  
`adapt install`  
(This second method will reinstall all plug-ins listed in *adapt.json*.)  

### Installing Prism
Narrative Code works based on the [Prism](https://prismjs.com) highlighter. To keep the code small, you will have to install this library and css yourself based on which languages and style you want to have. To do so, visit the [Prism download page](https://prismjs.com/download.html) and select the languages and theme you want. Place the resulting prism.js file in src/core/js/libraries. Rename the css file as "prism.less" and place it in src/core/less.


## Settings Overview

The attributes listed below are used in *components.json* to configure **Narrative Code**, and are properly formatted as JSON in [*example.json*](https://github.com/CollierCZ/adapt-narrativeCode/blob/master/example.json).

### Attributes

[**core model attributes**](https://github.com/adaptlearning/adapt_framework/wiki/Core-model-attributes): These are inherited by every Adapt component. [Read more](https://github.com/adaptlearning/adapt_framework/wiki/Core-model-attributes).

**_component** (string): This value must be: `narrativeCode`.

**_classes** (string): CSS class name to be applied to **Narrative Code**’s containing div. The class must be predefined in one of the Less files. Separate multiple classes with a space.

**_layout** (string): This defines the horizontal position of the component in the block. Acceptable values are `full`, `left` or `right`; however, `full` is typically the only option used as `left` or `right` do not allow much room for the component to display.

**instruction** (string): This optional text appears above the component. It is frequently used to guide the learner’s interaction with the component.   

**mobileInstruction** (string): This is optional instruction text that will be shown when viewed on mobile. It may be used to guide the learner’s interaction with the component.   

**_hasNavigationInTextArea** (boolean): Determines the location of the arrows (icons) used to navigate from slide to slide. Navigation can overlay the image or the text. Set to `true` to have the navigation controls appear in the text region.

**_setCompletionOn** (string): This value determines when the component registers as complete. Acceptable values are `"allItems"` and `"inview"`. `"allItems"` requires the learner to navigate to each slide. `"inview"` requires the **Narrative** component to enter the view port completely, top and bottom.

**_items** (array): Multiple items may be created. Each item represents one slide and contains values for the narrative (**title**, **body**), the image (**_graphic**), and the slide's header when viewed on a mobile device (**_strapLine**).

>**title** (string): This value is the title for this narrative element.

>**body** (string): This is the main text for this narrative element.

>**code* (object): The code that appears next to the narrative text. It contains values for **src** and **lang**.

>>**src** (string): The code that you want highlighted.

>>**lang** (string): The language that will be used by the highlighter to determine what should be highlighted. It should fit within the list given for [Prism's supported languages](https://prismjs.com/index.html#languages-list).

>**strapline** (string): This text is displayed as a title above the code when `Adapt.device.screenSize` is `small` (i.e., when viewed on mobile devices).  

### Accessibility  
**Narrative Code** has been assigned a label using the [aria-label](https://github.com/adaptlearning/adapt_framework/wiki/Aria-Labels) attribute: **ariaRegion**. This label is not a visible element. It is utilized by assistive technology such as screen readers. Should the region's text need to be customised, it can be found within the **globals** object in [*properties.schema*](https://github.com/CollierCZ/adapt-narrativeCode/blob/master/properties.schema).   
<div float align=right><a href="#top">Back to Top</a></div>

## Limitations

On mobile devices, the narrative text is collapsed above the code. It is accessed by clicking an icon (+) next to the strapline.

----------------------------
**Version number:**  0.5
**Framework versions:** 3.2+  
**Author / maintainer:** [Aaron Collier](https://github.com/CollierCZ). Forked in June 2018 from the [Narrative component](https://github.com/adaptlearning/adapt-contrib-narrative) written by the Adapt Core Team with [contributors](https://github.com/adaptlearning/adapt-contrib-narrative/graphs/contributors)    
