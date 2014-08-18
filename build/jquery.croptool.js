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

;(function ( window, document, $, undefined ) {

"use strict";

var Croptool;

Croptool = function ( element, options ) {

    var that = this;

    that.element = element;
    that.options = $.extend({}, options);
    that.mode = Croptool.MODE_NORMAL;
    that.state = Croptool.STATE_NULL;
    that.direction = Croptool.DIRECTION_BOTH;

    that.initOptions(function () {
        that.createDOM(element);
        that.attachListeners();

        if (that.selection) {
            that.requestUpdate();
        }
    });
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
    dots: true,
    keyboard: true,
    margin: 0.02,
    movable: true,
    resizable: true,
    persistent: true
};

/*
 *
 * Template for creating crop elements. This element is not used by as it is,
 * but cloned for every instance of Croptool.
 *
 */
Croptool.template = (function () {

    var wrapper = document.createElement('div'),
        container = document.createElement('div'),
        selection = document.createElement('div'),
        remdant = document.createElement('div'),
        point = document.createElement('div'),
        classes = 'top|top-right|right|bottom-right|bottom|bottom-left|left|top-left'.split('|'),
        prefix = 'croptool-',
        clone,
        i;

    wrapper.className = prefix + 'wrapper';
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
    wrapper.appendChild(container);

    return wrapper;

}());

Croptool.requestAnimationFrame = (function () {

    var requestAnimationFrames = [
        'oRequestAnimationFrame',
        'webkitRequestAnimationFrame',
        'mozRequestAnimationFrame',
        'msRequestAnimationFrame'
        ], requestAnimationFrame = 'requestAnimationFrame';

    while (requestAnimationFrame) {
        if (window[requestAnimationFrame]) {
            return requestAnimationFrame;
        } else {
            requestAnimationFrame = requestAnimationFrames.pop();
        }
    }

    return false;

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
        $wrapper = $(Croptool.template.cloneNode(true)),
        $container = $('.croptool-container', $wrapper),
        $selection = $('.croptool-selection', $wrapper),
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
    $element.parent().append($wrapper);
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

    if (!this.options.dots) {
        $selection.addClass('no-dots');
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

        if (e.which === 1) {
            that.dragStart(e);
        }
    });

    $body.on('mousemove', function ( e ) {
        that.dragMove(e);
    });

    $body.on('mouseup', function ( e ) {
        that.dragEnd(e);
    });

    $body.on('mouseleave', function ( e ) {
        that.dragEnd(e);
    });

    $(document).on('mouseleave', function ( e ) {
        that.dragEnd(e);
    });
};

Croptool.prototype.initOptions = function ( callback ) {

    var that = this,
        options = that.options,
        doInit,
        image;

    /*
     *
     * Synchronous initializations
     *
     */
    doInit = function () {

        /*
         *
         * If max values are not set, setting image real size to max size
         *
         */
        if (typeof options.max === 'undefined') {
            options.max = options.real;
        } else {

            // if max width is less than 0 setting max width to real width
            if (options.max.w < 0) {
                options.max.w = Math.real.w;

            // otherwise taking max width or real width, which ever is smaller
            } else {
                options.max.w = Math.min(options.max.w, options.real.w);
            }

            // if max height is less than 0 setting max height to real height
            if (options.max.h < 0) {
                options.max.h = Math.real.h;

            // otherwise taking max height or real height, which ever is smaller
            } else {
                options.max.h = Math.min(options.max.h, options.real.h);
            }
        }

        if (typeof options.min === 'undefined') {
            options.min = {
                w: 0,
                h: 0,
                wp: 0,
                hp: 0
            };

        } else {
            options.min.wp = options.min.w / options.real.w;
            options.min.hp = options.min.h / options.real.h;
        }

        options.max.wp = options.max.w / options.real.w;
        options.max.hp = options.max.h / options.real.h;

        if (options.selection) {
            that.selection = that.convertSelection(options.selection, true);
        }

        if (typeof callback === 'function') {
            callback();
        }
    };

    /*
     *
     * Asynchronous initialization
     *
     */
    if (!options.real) {

        image = $(document.createElement('img'));

        image.on('load', function () {

            that.options.real = {
                w: image.prop('width'),
                h: image.prop('height')
            };

            doInit();

        });

        image.attr('src', that.element.src + '?' + (new Date()).getTime());

    } else {
        doInit();
    }
};

Croptool.prototype.requestUpdate = function () {

    var that = this;

    if (that.updatePending) {
        return;
    }

    /*
     *
     * Optimize drawing with animation frame, if available.
     *
     */
    if (Croptool.requestAnimationFrame) {
        that.updatePending = true;
        window[Croptool.requestAnimationFrame](function () {
            that.updatePending = false;
            that.doUpdate();
        });

    } else {
        that.doUpdate();
    }
};

Croptool.prototype.doUpdate = function () {

    this.elements.$selection.css('display', 'none');

    if (this.selection) {
        this.elements.$selection.css('left', this.selection.x * 100 + '%');
        this.elements.$selection.css('top', this.selection.y * 100 + '%');
        this.elements.$selection.css('width', this.selection.w * 100 + '%');
        this.elements.$selection.css('height', this.selection.h * 100 + '%');
        this.elements.$selection.css('display', 'block');
    }
};

/*
 *
 * Convert absolute position on croptool to percents. Used when mouse event
 * absolute point needs to be translated to percents.
 *
 */
Croptool.prototype.convertPoint = function ( values ) {

    var offset = this.elements.$container.offset();

    return {
        x: (values.x - offset.left) / this.elements.container.offsetWidth,
        y: (values.y - offset.top) / this.elements.container.offsetHeight
    };
};

Croptool.prototype.convertSelection = function ( selection, reversed ) {

    var options = this.options,
        converted,
        range,
        max,
        min;

    if (reversed) {

        return {
            x: selection.x / options.real.w,
            y: selection.y / options.real.h,
            w: selection.w / options.real.w,
            h: selection.h / options.real.h
        };

    } else {

        max = options.max;
        min = options.min;

        converted = {
            x: Math.round(selection.x * options.real.w),
            y: Math.round(selection.y * options.real.h),
            w: Math.round(selection.w * options.real.w),
            h: Math.round(selection.h * options.real.h)
        };

        if (min) {

            if (typeof min.w !== 'undefined') {

                if (converted.w < min.w) {
                    converted.w = min.w;
                }
            }

            if (typeof min.h !== 'undefined') {
                
                if (converted.h < min.h) {
                    converted.h = min.h;
                }
            }
        }

        if (max) {

            if (typeof max.w !== 'undefined') {

                if (converted.w > max.w) {
                    converted.w = max.w;
                }
            }

            if (typeof max.h !== 'undefined') {
                
                if (converted.h > max.h) {
                    converted.h = max.h;
                }
            }
        }

        range = converted.x + converted.w;

        if (range > options.real.w) {
            converted.x -= range - options.real.w;
        }

        range = converted.y + converted.h;

        if (range > options.real.h) {
            converted.y -= range - options.real.h;
        }

        /*
         *
         * Prevent value being minus zero (-0)
         *
         */
        converted.x = Math.abs(converted.x);
        converted.y = Math.abs(converted.y);
        converted.w = Math.abs(converted.w);
        converted.h = Math.abs(converted.h);

        return converted;
    }
};

/*
 *
 * Test if point is on selection area. Used when testing if mouse press is
 * happening on top of selection and resizing or moving should start.
 *
 */
Croptool.prototype.testSelectionHit = function ( point ) {

    var sel = this.selection,
        mar = this.options.margin;

    /*
     *
     * If there is no selection, point cannot be over selection
     *
     */
    if (!sel) {
        return false;
    }

    if (point.y < sel.y - mar || point.y > sel.y + sel.h + mar) {
        return false;
    }

    if (point.x < sel.x - mar || point.x > sel.x + sel.w + mar) {
        return false;
    }

    return true;
};

/*
 *
 * Test if point is on croptool container element.
 *
 */
Croptool.prototype.testComponentHit = function ( point ) {

    if (point.y < 0 || point.y > 1 || point.x < 0 || point.x > 1) {
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

    if (sel) {
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
 * evaluation before giving it to public.
 *
 */
Croptool.prototype.selection = undefined;

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

    var point = this.convertPoint(Croptool.getPointFromEvent(e)),
        options = this.options,
        origin,
        state;

    if (!this.testComponentHit(point)) {
        return;

    } else if (!this.testSelectionHit(point)) {

        if (!this.selection) {
            this.selection = {};
        } else {

            if (options.persistent) {
                e.preventDefault();
                return;
            }
        }

        this.selection.x = point.x;
        this.selection.y = point.y;
        this.selection.w = 0;
        this.selection.h = 0;
    }

    if (e.altKey) {
        this.mode = Croptool.MODE_CENTER;
    } else {
        this.mode = Croptool.MODE_NORMAL;
    }

    e.preventDefault();

    origin = this.getOrigin(point);

    this.applyOrigin(origin);

    if (this.state === Croptool.STATE_MOVE) {

        if (!options.movable) {
            this.state = Croptool.STATE_NULL;
            return;
        }

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
            y: this.selection.y
        };

    } else {

        if (!options.resizable) {
            this.state = Croptool.STATE_NULL;
            return;
        }

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

    if (typeof this.options.onstart === 'function') {
        this.options.onstart(this.convertSelection(this.selection));
    }

    this.setCursor(this.getCursor(origin));
};

Croptool.prototype.dragMove = function ( e ) {

    var point = this.convertPoint(Croptool.getPointFromEvent(e));

    if (e.altKey) {
        this.mode = Croptool.MODE_CENTER;
    } else {
        this.mode = Croptool.MODE_NORMAL;
    }

    if (this.state !== Croptool.STATE_NULL) {

        e.preventDefault();

        this.drag.point = point;
        this.updateSelection();

        if (typeof this.options.onchange === 'function') {
            this.options.onchange(this.convertSelection(this.selection));
        }
    }

    this.setCursor(this.getCursor(this.getOrigin(point)));
};

Croptool.prototype.dragEnd = function ( e ) {

    e.preventDefault();

    if (e.altKey) {
        this.mode = Croptool.MODE_CENTER;
    } else {
        this.mode = Croptool.MODE_NORMAL;
    }

    if (this.state !== Croptool.STATE_NULL) {
        this.state = Croptool.STATE_NULL;

        if (typeof this.options.onend === 'function') {
            this.options.onend(this.convertSelection(this.selection));
        }
    }

    this.setCursor(this.getCursor(this.getOrigin(this.convertPoint(Croptool.getPointFromEvent(e)))));
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

    if (selection.x < 0) {
        selection.x = 0;
    } else if (selection.x + selection.w > 1) {
        selection.x -= selection.x + selection.w - 1;
    }

    if (selection.y < 0) {
        selection.y = 0;
    } else if (selection.y + selection.h > 1) {
        selection.y -= selection.y + selection.h - 1;
    }

    this.requestUpdate();
};

Croptool.prototype.getDimension = function ( direction ) {

    var value1,
        value2,
        position,
        length,
        min,
        max;

    if (direction === Croptool.DIRECTION_HORIZONTAL) {
        value1 = this.drag.point.x;
        min = this.options.min.wp;
        max = this.options.max.wp;

        if (this.mode === Croptool.MODE_NORMAL) {
            value2 = this.drag.end.x;
        } else {
            value2 = this.drag.center.x;
        }

    } else {
        value1 = this.drag.point.y;
        min = this.options.min.hp;
        max = this.options.max.hp;

        if (this.mode === Croptool.MODE_NORMAL) {
            value2 = this.drag.end.y;
        } else {
            value2 = this.drag.center.y;
        }
    }

    if (this.mode === Croptool.MODE_NORMAL) {

        if (value1 > value2) {
            max = Math.min(1 - value2, max);
        } else {
            max = Math.min(value2, max);
        }

        if (Math.abs(value1 - value2) > max) {
            if (value1 > value2) {
                value1 = value2 + max;
            } else {
                value1 = value2 - max;
            }
        }

        if (Math.abs(value1 - value2) < min) {
            if (value1 > value2) {
                value1 = value2 + min;
            } else {
                value1 = value2 - min;
            }
        }

        if (value1 > value2) {
            position = value2;
            length = value1 - value2;
        } else {
            position = value1;
            length = value2 - value1;
        }

    } else {

        max = Math.min(value2 * 2, (1 - value2) * 2, max);

        if (Math.abs(2 * (value1 - value2)) > max) {
            if (value1 > value2) {
                value1 = value2 + max / 2;
            } else {
                value1 = value2 - max / 2;
            }
        }

        if (Math.abs(2 * (value1 - value2)) < min) {
            if (value1 > value2) {
                value1 = value2 + min / 2;
            } else {
                value1 = value2 - min / 2;
            }
        }

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