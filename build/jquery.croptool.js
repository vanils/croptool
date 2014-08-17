/*
 *
 * jQuery Croptool v1.0.0
 * http://github.com/vanils/croptool
 *
 * Copyright 2014, Matti Mehtonen
 * Licensed under the MIT license.
 * http://github.com/vanils/croptool/blob/master/LICENSE
 *
 */

(function ( window, document, $ ) {

"use strict";

var Croptool;

Croptool = function ( element, options ) {
    this.options = options;
    this.mode = Croptool.MODE_NORMAL;
    this.state = Croptool.STATE_NULL;
    this.direction = Croptool.DIRECTION_BOTH;
    this.createDOM(element);
    this.attachListeners();
};

Croptool.MODE_CENTER = 1;
Croptool.MODE_NORMAL = 2;

Croptool.STATE_NULL = 3;
Croptool.STATE_MOVE = 4;
Croptool.STATE_RESIZE = 5;

Croptool.DIRECTION_VERTICAL = 6;
Croptool.DIRECTION_HORIZONTAL = 7;
Croptool.DIRECTION_BOTH = 8;

Croptool.defaults = {
    aspectRatio: undefined,
    disabled: false,
    dragPoints: true,
    keyboard: true,
    margin: 0.01,
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

/*
 *
 * Template for creating crop elements. This element is not used by as it is,
 * but cloned for every instance of Croptool.
 *
 */
Croptool.template = (function () {

    var container = document.createElement('div'),
        selection = document.createElement('div'),
        remdant = document.createElement('div'),
        point = document.createElement('div'),
        classes = 'top|top-right|right|bottom-right|bottom|bottom-left|left|top-left'.split('|'),
        prefix = 'croptool-',
        clone,
        i;

    container.className = prefix + 'container';
    selection.className = prefix + 'selection';
    remdant.className = prefix + 'remnant';
    point.className = prefix + 'point';

    for (i = 0; i < 4; i++) {
        clone = remdant.cloneNode(false);
        clone.className += ' ' + prefix + 'remnant-' + classes[i * 2];
        selection.appendChild(clone);
    }

    for (i = 0; i < 8; i++) {
        clone = point.cloneNode(false);
        clone.className += ' ' + prefix + 'point-' + classes[i];
        selection.appendChild(clone);
    }

    container.appendChild(selection);

    return container;

}());

/*
 *
 * Normalized event (mouse/touch) and returns position relative to document.
 *
 */
Croptool.getPointFromEvent = function ( e ) {

    var type = e.type,
        result = {},
        touches;

    if (type === "touchstart") {
        touches = e.touches;
        result.x = touches[0].pageX;
        result.y = touches[0].pageY;

    } else if (type === "touchmove") {
        touches = e.touches;
        result.x = touches[0].pageX;
        result.y = touches[0].pageY;

    } else if (type === "touchend") {
        touches = e.changedTouches;
        result.x = touches[0].pageX;
        result.y = touches[0].pageY;
    } else {
        result.x = e.pageX;
        result.y = e.pageY;
    }

    return result;
};

/*
 *
 * Creating DOM structure for crop tool.
 *
 */
Croptool.prototype.createDOM = function ( element ) {

    var $element = $(element),
        $container = $(Croptool.template.cloneNode(true)),
        $selection = $('.croptool-selection', $container),
        outline;

    this.elements = {
        $container: $container,
        $selection: $selection,
        container: $container[0],
        selection: $selection[0]
    };

    /*
     *
     * Original image is detached from DOM and placed inside croptool container.
     *
     */
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
};

/*
 *
 * Attaching listeners for mouse/touch events.
 *
 */
Croptool.prototype.attachListeners = function () {

    var $window = $(window),
        $body = $('body'),
        that = this;

    $window.on('keydown', function ( e ) {

        if ( e.which === 18 ) {
            that.mode = Croptool.MODE_CENTER;

            if (that.state !== Croptool.STATE_NULL) {
                that.updateSelection();
            }
        }
    });

    $window.on('keyup', function ( e ) {

        if ( e.which === 18 ) {
            that.mode = Croptool.MODE_NORMAL;

            if (that.state !== Croptool.STATE_NULL) {
                that.updateSelection();
            }
        }
    });

    $body.on('mousedown', function ( e ) {
        that.dragStart(e);
    });

    $body.on('mousemove', function ( e ) {
        that.dragMove(e);
    });

    $body.on('mouseup', function ( e ) {
        that.dragEnd(e);
    });
};

/*
 *
 * Convert absolute position on croptool to percents. Used when mouse event
 * absolute point needs to be translated to percents.
 *
 */
Croptool.prototype.pointToPercents = function ( values ) {

    var offset = this.elements.$container.offset();

    return {
        x: (values.x - offset.left) / this.elements.container.offsetWidth,
        y: (values.y - offset.top) / this.elements.container.offsetHeight
    };
};

/*
 *
 * Test if point is on selection area. Used when testing if mouse press is
 * happening on top of selection and resizing or moving should start.
 *
 */
Croptool.prototype.testHitPoint = function ( point ) {

    var s = this.selection;

    if (point.y < s.y - s.m || point.y > s.y + s.h + s.m) {
        return false;
    }

    if (point.x < s.x - s.m || point.x > s.x + s.w + s.m) {
        return false;
    }

    return true;
};

/*
 *
 * Get origin corner of current according to point on croptool. If point is for
 * example near the top right corner, origin point will be on opposite corner
 * and this method will return { x: 0, y: 1 }
 *
 */
Croptool.prototype.getOrigin = function ( point ) {

    var sel = this.selection,
        mar = this.options.margin,
        x,
        y;

    if (point.x >= sel.x - mar && point.x <= sel.x + mar) {
        x = 1;
    } else if (point.x >= sel.x + sel.w - mar && point.x <= sel.x + sel.w + mar) {
        x = 0;
    }

    if (point.y >= sel.y - mar && point.y <= sel.y + mar) {
        y = 1;
    } else if (point.y >= sel.y + sel.h - mar && point.y <= sel.y + sel.h + mar) {
        y = 0;
    }

    return {
        x: x,
        y: y
    };
};

Croptool.prototype.applyOrigin = function ( origin ) {

    var x = origin.x,
        y = origin.y;

    if (typeof x === 'undefined' && typeof y === 'undefined') {
        this.state = Croptool.STATE_MOVE;
        return;
    }

    this.state = Croptool.STATE_RESIZE;

    if (typeof x !== 'undefined' && typeof y !== 'undefined') {
        this.direction = Croptool.DIRECTION_BOTH;
    } else if (typeof x !== 'undefined') {
        this.direction = Croptool.DIRECTION_HORIZONTAL;
    } else {
        this.direction = Croptool.DIRECTION_VERTICAL;
    }
};

/*
 *
 * Geting cursor type. Cursor changes dynamically according to mouse position.
 * For example when moving image cursor is not the same as when resizing image
 * from top right corner.
 *
 */
Croptool.prototype.getCursor = function ( origin ) {

    if (!origin) {
        return 'default';
    }

    if (typeof origin.x === 'undefined') {

        // origin is not in any corner
        if (typeof origin.y === 'undefined') {
            return 'move';

        // origin is on bottom or top (mouse is on opposite side of selection)
        } else {
            return 'ns-resize';
        }

    } else if (origin.x) {

        // origin is on right (mouse is on left side of selection)
        if (typeof origin.y === 'undefined') {
            return 'ew-resize';

        // origin is on bottom right (mouse is on top left corner)
        } else if (origin.y) {
            return 'nwse-resize';

        // origin is on top right (mouse is on bottom left corner)
        } else {
            return 'nesw-resize';
        }

    } else {

        // origin is on left (mouse is on right side of selection)
        if (typeof origin.y === 'undefined') {
            return 'ew-resize';

        // origin is on bottom left (mouse is on top right corner)
        } else if (origin.y) {
            return 'nesw-resize';

        // origin is on top left (mouse is on bottom right corner)
        } else {
            return 'nwse-resize';
        }
    }
};

/*
 *
 * Change mouse cursor.
 *
 */
Croptool.prototype.setCursor = function ( cursor ) {

    if (this.cursor !== cursor) {
        this.elements.$container.css('cursor', cursor);
        this.cursor = cursor;
    }
};

/*
 *
 * This is the all mighty selection. Contains raw data and still needs
 * evaluation before giving is publically available.
 *
 */
Croptool.prototype.selection = {
    x: 0.23,
    y: 0.23,
    w: 0.67,
    h: 0.56
};

/*
 *
 * Contains information about drag points.
 *
 */
Croptool.prototype.drag = {};

/*
 *
 * Starting the drag. If mouse is on top of selection area, this kicks of crop
 * area manipulations.
 *
 */
Croptool.prototype.dragStart = function ( e ) {

    var point = this.pointToPercents(Croptool.getPointFromEvent(e)),
        origin,
        state;

    if (e.altKey) {
        this.mode = Croptool.MODE_CENTER;
    } else {
        this.mode = Croptool.MODE_NORMAL;
    }

    // event point is in selection area
    if (this.testHitPoint(point)) {

        e.preventDefault();

        origin = this.getOrigin(point);

        this.applyOrigin(origin);

        if (this.state === Croptool.STATE_MOVE) {

            // dynamic mousepoint
            this.drag.point = {
                x: point.x,
                y: point.y
            };

            // initial mousepoint
            this.drag.init = {
                x: point.x,
                y: point.y
            };

            // original selection point
            this.drag.original = {
                x: this.selection.x,
                y: this.selection.y,
            };

        } else {

            // dynamic mousepoint
            this.drag.point = {
                x: point.x,
                y: point.y
            };

            // used when mode is normal
            this.drag.end = (function (that) {

                var x,
                    y;

                if (typeof origin.x !== 'undefined') {
                    x = that.selection.x + that.selection.w * origin.x;
                }

                if (typeof origin.y !== 'undefined') {
                    y = that.selection.y + that.selection.h * origin.y;
                }

                return {
                    x: x,
                    y: y
                };

            }(this));

            // used when mode is centered
            this.drag.center = (function (that) {

                var x,
                    y;

                if (typeof origin.x !== 'undefined') {
                    x = that.selection.x + that.selection.w * 0.5;
                }

                if (typeof origin.y !== 'undefined') {
                    y = that.selection.y + that.selection.h * 0.5;
                }

                return {
                    x: x,
                    y: y
                };

            }(this));
        }

        this.setCursor(this.getCursor(origin));

    // event point is not in selection area
    } else {

    }
};

Croptool.prototype.dragMove = function ( e ) {

    var point = this.pointToPercents(Croptool.getPointFromEvent(e));

    if (e.altKey) {
        this.mode = Croptool.MODE_CENTER;
    } else {
        this.mode = Croptool.MODE_NORMAL;
    }

    if (this.state === Croptool.STATE_NULL) {

        if (this.testHitPoint(point)) {
            this.setCursor(this.getCursor(this.getOrigin(point)));
        }

    } else {

        e.preventDefault();

        this.drag.point = point;
        this.updateSelection();
    }
};

Croptool.prototype.dragEnd = function ( e ) {

    e.preventDefault();

    if (e.altKey) {
        this.mode = Croptool.MODE_CENTER;
    } else {
        this.mode = Croptool.MODE_NORMAL;
    }

    this.state = Croptool.STATE_NULL;
    this.setCursor(this.getCursor(this.getOrigin(this.pointToPercents(Croptool.getPointFromEvent(e)))));
};

Croptool.prototype.updateSelection = function () {

    var selection = this.selection,
        drag = this.drag,
        horizontal,
        vertical;

    if (this.state === Croptool.STATE_MOVE) {
        selection.x = drag.original.x + drag.point.x - drag.init.x;
        selection.y = drag.original.y + drag.point.y - drag.init.y;
    } else {

        if (this.direction === Croptool.DIRECTION_BOTH) {
            horizontal = this.getDimension(Croptool.DIRECTION_HORIZONTAL);
            vertical = this.getDimension(Croptool.DIRECTION_VERTICAL);
            selection.x = horizontal.position;
            selection.w = horizontal.length;
            selection.y = vertical.position;
            selection.h = vertical.length;
        } else if (this.direction === Croptool.DIRECTION_VERTICAL) {
            vertical = this.getDimension(Croptool.DIRECTION_VERTICAL);
            selection.y = vertical.position;
            selection.h = vertical.length;
        } else {
            horizontal = this.getDimension(Croptool.DIRECTION_HORIZONTAL);
            selection.x = horizontal.position;
            selection.w = horizontal.length;
        }
    }

    this.elements.$selection.css('display', 'none');
    this.elements.$selection.css('left', selection.x * 100 + '%');
    this.elements.$selection.css('top', selection.y * 100 + '%');
    this.elements.$selection.css('width', selection.w * 100 + '%');
    this.elements.$selection.css('height', selection.h * 100 + '%');
    this.elements.$selection.css('display', 'block');
};

Croptool.prototype.getDimension = function ( direction, maxLength ) {

    var value1,
        value2,
        position,
        length;

    if (direction === Croptool.DIRECTION_HORIZONTAL) {
        value1 = this.drag.point.x;

        if (this.mode === Croptool.MODE_NORMAL) {
            value2 = this.drag.end.x;
        } else {
            value2 = this.drag.center.x;
        }

    } else {
        value1 = this.drag.point.y;

        if (this.mode === Croptool.MODE_NORMAL) {
            value2 = this.drag.end.y;
        } else {
            value2 = this.drag.center.y;
        }
    }

    if (this.mode === Croptool.MODE_NORMAL) {

        if (value1 > value2) {
            position = value2;
            length = value1 - value2;
        } else {
            position = value1;
            length = value2 - value1;
        }

    } else {

        if (value1 > value2) {
            position = 2 * value2 - value1;
            length = 2 * (value1 - value2);
        } else {
            position = value1;
            length = 2 * (value2 - value1);
        }
    }

    return {
        position: position,
        length: length
    };
};

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