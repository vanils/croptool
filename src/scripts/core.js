
(function ( window, document, $ ) {

"use strict";

var Croptool;

Croptool = function ( element, options ) {

    var $element = $(element),
        $container = $(Croptool.template.cloneNode(true)),
        $selection = $('.croptool-selection', $container),
        body = $('body'),
        croptool = this,
        outline;

    this.elements = {
        container: $container[0],
        $container: $container,
        selection: $selection[0],
        $selection: $selection
    };

    this.options = options;

    $element.parent().append($container);
    $container.append($element);

    /*
     *
     * Making sure that outline style exists on selection element and if not,
     * falling back to another styling.
     *
     */
    outline = $selection.css('outline-width');

    if (!outline) {
        $selection.addClass('no-outline');
    } else if (!parseInt(outline, 10)) {
        $selection.addClass('no-outline');
    }

    body.on('mousedown', function ( e ) {
        croptool.dragStart(e);
    });

    body.on('mousemove', function ( e ) {
        croptool.dragMove(e);
    });

    body.on('mouseup', function ( e ) {
        croptool.dragEnd(e);
    });
};

Croptool.DEFAULT = 0;
Croptool.MOVE = 1;
Croptool.RESIZE_VERTICAL = 2;
Croptool.RESIZE_HORIZONTAL = 3;
Croptool.RESIZE_BOTH = 4;
Croptool.VERTICAL = 5;
Croptool.HORIZONTAL = 6;

Croptool.prototype.convert = function ( values ) {

    var offset = this.elements.$container.offset(),
        x = 100 * (values.x - offset.left) / this.elements.container.offsetWidth,
        y = 100 * (values.y - offset.top) / this.elements.container.offsetHeight;

    return {
        x: x > 100 ? 100 : x < 0 ? 0 : x,
        y: y > 100 ? 100 : y < 0 ? 0 : y
    };
};

Croptool.prototype.getOrigin = function ( point ) {

    var s = this.selection,
        x,
        y;

    if (point.x > s.x - s.m && point.x < s.x + s.m) {
        x = 100;
    } else if (point.x > s.x + s.w - s.m && point.x < s.x + s.w + s.m) {
        x = 0;
    } else if (point.x > s.x && point.x < s.x + s.w) {
        x = 50;
    }

    if (point.y > s.y - s.m && point.y < s.y + s.m) {
        y = 100;
    } else if (point.y > s.y + s.h - s.m && point.y < s.y + s.h + s.m) {
        y = 0;
    } else if (point.y > s.y && point.y < s.y + s.h) {
        y = 50;
    }

    if (typeof x === 'undefined' || typeof y === 'undefined') {
        return;
    }

    return {
        x: x,
        y: y
    };
};

Croptool.prototype.getCursor = function ( origin ) {

    if (!origin) {
        return 'default';
    }

    var c = Croptool.cursors,
        x = 'x' + origin.x,
        y = 'y' + origin.y;

    return c[x] && c[x][y];
};

Croptool.prototype.getState = function ( origin ) {

    if (origin.x === 50 && origin.y === 50) {
        return Croptool.MOVE;
    } else if (origin.x === 50) {
        return Croptool.RESIZE_VERTICAL;
    } else if (origin.y === 50) {
        return Croptool.RESIZE_HOIZONTALR;
    } else {
        return Croptool.RESIZE_BOTH;
    }
};

Croptool.prototype.setCursor = function ( cursor ) {

    if (this.selection.cursor !== cursor) {
        this.elements.$container.css('cursor', cursor);
        this.selection.cursor = cursor;
    }
};

Croptool.prototype.validateSelection = function () {

    var selection = this.selection,
        drag = this.drag;

    if (selection.w < 0) {
        this.mirror(Croptool.HORIZONTAL);
    }

    if (selection.h < 0) {
        this.mirror(Croptool.VERTICAL);
    }

    // width = this.options.realWidth * selection.w / 100;
    // height = this.options.realHeight * selection.h / 100;

    // if (width < this.options.minWidth) {
    //     selection.w = this.options.minWidth / this.options.realWidth * 100;
    // }

    // if (height < this.options.minHeight) {
    //     selection.h = this.options.minHeight / this.options.realHeight * 100;
    // }

    return selection;
};

Croptool.prototype.mirror = function ( direction ) {

    var drag = this.drag,
        position,
        origin,
        size,
        key;

    if (direction === Croptool.HORIZONTAL) {
        size = drag.selection.w;
        origin = drag.origin.x;
        key = 'x';
    } else {
        size = this.drag.selection.h;
        origin = drag.origin.y;
        key = 'y';
    }

    switch (origin) {

        case 0:
            this.drag[key] += size;
            this.drag.init[key] -= size * 2;
            this.drag.selection[key] -= size;
            this.drag.origin[key] = 100;
            this.selection[key] = drag.selection[key] + size;
            break;

        case 50:
            this.drag[key] += size;
            this.drag.init[key] -= size * 2;
            this.drag.selection[key] -= size;
            this.drag.origin[key] = 100;
            this.selection[key] = drag.selection[key] + size;
            break;

        case 100:
            this.drag[key] -= size;
            this.drag.init[key] += size * 2;
            this.drag.selection[key] += size;
            this.drag.origin[key] = 0;
            this.selection[key] = drag.selection[key];
            break;
    }
};

Croptool.prototype.mirrorSelectionHorizontally = function () {

    var drag = this.drag,
        width = this.drag.selection.w;

    switch (drag.origin.x) {

        case 0:
            this.drag.x += width;
            this.drag.init.x -= width * 2;
            this.drag.selection.x -= width;
            this.drag.origin.x = 100;
            this.selection.x = drag.selection.x + width;
            break;

        case 100:
            this.drag.x -= width;
            this.drag.init.x += width * 2;
            this.drag.selection.x += width;
            this.drag.origin.x = 0;
            this.selection.x = drag.selection.x;
            break;
    }
};

Croptool.prototype.selection = {
    m: 1,
    x: 23,
    y: 23,
    w: 67,
    h: 56
};

Croptool.prototype.drag = {

    state: Croptool.DEFAULT,
    cursor: 'default',
    preserve: false,
    aspectRatio: undefined,

    x: 0,
    y: 0,

    init: {
        x: 0,
        y: 0
    },

    selection: {
        m: 0,
        x: 0,
        y: 0,
        w: 0,
        h: 0
    },

    origin: {
        x: 0,
        y: 0
    }
};

Croptool.prototype.dragStart = function ( e ) {

    e.preventDefault();

    $.extend(this.drag, this.convert({
        x: e.pageX,
        y: e.pageY
    }));

    this.drag.init.x = this.drag.x;
    this.drag.init.y = this.drag.y;
    this.drag.selection = $.extend({}, this.selection);
    this.drag.origin = this.getOrigin(this.drag);
    this.drag.state = this.getState(this.drag.origin);
    this.drag.cursor = this.getCursor(this.getOrigin(this.drag.init));
    this.drag.aspectRatio = this.options.aspectRatio || this.selection.w / this.selection.h;

    this.setCursor(this.drag.cursor);

    if (e.altKey) {
        this.drag.origin = {
            x: 50,
            y: 50
        };
    }

    if (e.shiftKey) {
        this.drag.preserve = true;
    }
};

Croptool.prototype.dragMove = function ( e ) {

    e.preventDefault();

    if (this.drag.state !== Croptool.DEFAULT) {

        $.extend(this.drag, this.convert({
            x: e.pageX,
            y: e.pageY
        }));

        this.updateSelection();
    }

    this.setCursor(this.getCursor(this.getOrigin(this.convert({
        x: e.pageX,
        y: e.pageY
    }))));
};

Croptool.prototype.dragEnd = function ( e ) {

    e.preventDefault();

    this.drag.state = Croptool.DEFAULT;

    this.setCursor(this.getCursor(this.getOrigin(this.convert({
        x: e.pageX,
        y: e.pageY
    }))));
};

Croptool.prototype.updateVerticalSelection = function () {

    var selection = this.selection,
        drag = this.drag;

    switch (drag.origin.y) {

        case 0:
            selection.h = drag.selection.h + drag.y - drag.init.y;
            break;

        case 50:

            if (drag.init.y > drag.selection.y + drag.selection.h * 0.5) {
                selection.y = drag.selection.y + drag.init.y - drag.y;
                selection.h = drag.selection.h - (drag.init.y - drag.y) * 2;
            } else {
                selection.y = drag.selection.y + drag.y - drag.init.y;
                selection.h = drag.selection.h + (drag.init.y - drag.y) * 2;
            }

            break;

        case 100:
            selection.y = drag.selection.y + drag.y - drag.init.y;
            selection.h = drag.selection.h + drag.init.y - drag.y;
            break;
    }
};

Croptool.prototype.updateHorizontalSelection = function () {

    var selection = this.selection,
        drag = this.drag;

    switch (drag.origin.x) {

        case 0:
            selection.w = drag.selection.w + drag.x - drag.init.x;
            break;

        case 50:

            if (drag.init.x > drag.selection.x + drag.selection.w * 0.5) {
                selection.x = drag.selection.x + drag.init.x - drag.x;
                selection.w = drag.selection.w - (drag.init.x - drag.x) * 2;
            } else {
                selection.x = drag.selection.x + drag.x - drag.init.x;
                selection.w = drag.selection.w + (drag.init.x - drag.x) * 2;
            }

            break;

        case 100:
            selection.x = drag.selection.x + drag.x - drag.init.x;
            selection.w = drag.selection.w + drag.init.x - drag.x;
            break;
    }

};

Croptool.prototype.updateSelection = function () {

    var selection = this.selection,
        drag = this.drag;

    switch (drag.state) {

    case Croptool.MOVE:
        selection.x = drag.selection.x + drag.x - drag.init.x;
        selection.y = drag.selection.y + drag.y - drag.init.y;
        break;

    case Croptool.RESIZE_VERTICAL:
        this.updateVerticalSelection();
        break;

    case Croptool.RESIZE_HOIZONTALR:
        this.updateHorizontalSelection();
        break;

    case Croptool.RESIZE_BOTH:
        this.updateVerticalSelection();
        this.updateHorizontalSelection();
        break;
    }

    this.validateSelection();

    this.elements.$selection.css('display', 'none');
    this.elements.$selection.css('left', selection.x + '%');
    this.elements.$selection.css('top', selection.y + '%');
    this.elements.$selection.css('width', selection.w + '%');
    this.elements.$selection.css('height', selection.h + '%');
    this.elements.$selection.css('display', 'block');
};

Croptool.defaults = {
    aspectRatio: undefined,
    disabled: false,
    dragPoints: true,
    keyboard: true,
    maxWidth: undefined,
    maxHeight: undefined,
    minWidth: 0,
    minHeight: 0,
    movable: true,
    persistent: true,
    resizable: true,
    trueWidth: undefined,
    trueHeight: undefined,
    x: undefined,
    y: undefined,
    width: undefined,
    height: undefined,
    change: undefined,
    end: undefined,
    start: undefined
};

Croptool.cursors = {
    x0: {
        y0: 'nwse-resize',
        y50: 'ew-resize',
        y100: 'nesw-resize'
    },

    x50: {
        y0: 'ns-resize',
        y50: 'move',
        y100: 'ns-resize'
    },

    x100: {
        y0: 'nesw-resize',
        y50: 'ew-resize',
        y100: 'nwse-resize'
    }
};

/*
 *
 * Template for creating crop elements
 *
 * structure:
 *
 * <div class="croptool-container">
 *     <div class="croptool-selection">
 *         <div class="croptool-point croptool-point-top"></div>
 *         <div class="croptool-point croptool-point-top-right"></div>
 *         <div class="croptool-point croptool-point-right"></div>
 *         <div class="croptool-point croptool-point-bottom-right"></div>
 *         <div class="croptool-point croptool-point-bottom"></div>
 *         <div class="croptool-point croptool-point-bottom-left"></div>
 *         <div class="croptool-point croptool-point-left"></div>
 *         <div class="croptool-point croptool-point-top-left"></div>
 *         <div class="croptool-remnant croptool-remnant-top"></div>
 *         <div class="croptool-remnant croptool-remnant-right"></div>
 *         <div class="croptool-remnant croptool-remnant-bottom"></div>
 *         <div class="croptool-remnant croptool-remnant-left"></div>
 *     </div>
 * </div>
 *
 */
Croptool.template = (function () {

    var container = document.createElement('div'),
        selection = document.createElement('div'),
        remdant = document.createElement('div'),
        point = document.createElement('div'),
        classes = ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'],
        clone,
        i;

    container.className = 'croptool-container';
    selection.className = 'croptool-selection';
    remdant.className = 'croptool-remnant';
    point.className = 'croptool-point';

    for (i = 0; i < 4; i++) {
        clone = remdant.cloneNode(false);
        clone.className += ' croptool-remnant-' + classes[i * 2];
        selection.appendChild(clone);
    }

    for (i = 0; i < 8; i++) {
        clone = point.cloneNode(false);
        clone.className += ' croptool-point-' + classes[i];
        selection.appendChild(clone);
    }

    container.appendChild(selection);

    return container;

}());

$.croptool = function ( selector, value ) {

    if (typeof selector === 'string') {

        switch (selector) {

        case 'defaults':
            if (typeof value !== 'undefined') {
                Croptool.defaults = $.extend(Croptool.defaults, value);
            }

            return Croptool.defaults;
        }
    }
};

$.fn.croptool = function ( selector, value ) {

    var options;

    /*
     *
     *
     *
     */
    if (typeof selector === 'string') {

        

    } else {

        options = $.extend(Croptool.defaults, selector);

        return this.each(function () {
            new Croptool(this, options);
        });
    }
};

}(window, document, window.jQuery));