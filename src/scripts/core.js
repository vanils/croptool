
;(function ( window, document, $, undefined ) {

"use strict";

var Croptool;

/*
 *
 * Constructor for single Croptool instance.
 *
 */
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

/*
 *
 * Mode where selection has origin on center.
 *
 */
Croptool.MODE_CENTER = 1;

/*
 *
 * Mode where selection has origin on opposite corner/side of mouse pointer.
 *
 */
Croptool.MODE_NORMAL = 2;

/*
 *
 * State where no resizing or moving is happening.
 *
 */
Croptool.STATE_NULL = 3;

/*
 *
 * State where selection is movable.
 *
 */
Croptool.STATE_MOVE = 4;

/*
 *
 * State where selection is resisable.
 *
 */
Croptool.STATE_RESIZE = 5;

/*
 *
 * Selection is resized only on vertical axis. This happens when mouse is on
 * top or bottom side of selection.
 *
 */
Croptool.DIRECTION_VERTICAL = 6;

/*
 *
 * Selection is resized only on horizontal axis. This happens when mouse is on
 * left or right side of selection.
 *
 */
Croptool.DIRECTION_HORIZONTAL = 7;

/*
 *
 * Selection is resized only on both axis. This happens when mouse is on any
 * corner of selection.
 *
 */
Croptool.DIRECTION_BOTH = 8;

/*
 *
 * Some default values for croptool.
 *
 */
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
 * Contains cursors for different situations. Structure of this object is made
 * to help to pick cursor with value of origin.
 *
 */
Croptool.cursors = {

    x0: {

        // mouse on bottom right
        y0: 'nwse-resize',

        // mouse on right
        y50: 'ew-resize',

        // mouse on top right
        y100: 'nesw-resize'
    },

    x50: {

        // mouse on bottom center
        y0: 'ns-resize',

        // mouse on center
        y50: 'move',

        // mouse on top center
        y100: 'ns-resize'
    },

    x100: {

        // mouse on bottom left
        y0: 'nesw-resize',

        // mouse on left
        y50: 'ew-resize',

        // mouse on top left
        y100: 'nwse-resize'
    }
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

/*
 *
 * Checking if browser supports animation frames. Animation frames are used to
 * optimize selection redraws.
 *
 */
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
 * Attaching all neccessary listeners.
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

/*
 *
 * Manipulating some options to fit the rest of the system. Also getting image
 * real width and height if not gotten from options.
 *
 */
Croptool.prototype.initOptions = function ( callback ) {

    var that = this,
        options = that.options,
        doInit,
        image;

    /*
     *
     * Delayed initializations
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

            // default min values
            options.min = {
                w: 0,
                h: 0,
                wp: 0,  // min width in percents
                hp: 0   // min height in percents
            };

        } else {

            // min width in percents
            options.min.wp = options.min.w / options.real.w;

            // min height in percents
            options.min.hp = options.min.h / options.real.h;
        }

        // max width in percents
        options.max.wp = options.max.w / options.real.w;

        // max height in percents
        options.max.hp = options.max.h / options.real.h;

        // initial selection
        if (options.selection) {
            that.selection = that.convertSelection(options.selection, true);
        }

        if (typeof callback === 'function') {
            callback();
        }
    };

    /*
     *
     * If image real width and height is not set as options, they must be
     * sniffed.
     *
     */
    if (!options.real) {

        image = $(document.createElement('img'));

        image.on('load', function () {

            that.options.real = {
                w: image.prop('width'),
                h: image.prop('height')
            };

            // do other initializations
            doInit();

        });

        image.attr('src', that.element.src + '?' + (new Date()).getTime());

    } else {

        // do other initializations
        doInit();
    }
};

/*
 *
 * Called after selection has changed. Updates visual selection on DOM, but
 * tries to optimize drawing with requestAnimationFrame if available.
 *
 */
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

    /*
     *
     * if animation frames are not available, just update straight away
     *
     */
    } else {
        that.doUpdate();
    }
};

/*
 *
 * This updates DOM according to data in selection object. Invoked only by
 * requestUpdate method.
 *
 */
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

/*
 *
 * Convert pixel selection to percentage selection or percentage selection to
 * pizel selection.
 *
 */
Croptool.prototype.convertSelection = function ( selection, reversed ) {

    var options = this.options,
        converted,
        range,
        max,
        min;

    /*
     *
     * Pixel selection to percentage selection
     *
     */
    if (reversed) {

        return {
            x: selection.x / options.real.w,
            y: selection.y / options.real.h,
            w: selection.w / options.real.w,
            h: selection.h / options.real.h
        };

    /*
     *
     * Percentage selection to pixel selection
     *
     */
    } else {

        max = options.max;
        min = options.min;

        converted = {
            x: Math.round(selection.x * options.real.w),
            y: Math.round(selection.y * options.real.h),
            w: Math.round(selection.w * options.real.w),
            h: Math.round(selection.h * options.real.h)
        };

        /*
         *
         * Making sure the selection is not smaller than min selection size
         *
         */
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

        /*
         *
         * Making sure the selection is not bigger than max selection size
         *
         */
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

        /*
         *
         * Making sure selection area is inside real image area on horizontal
         * axis
         *
         */
        range = converted.x + converted.w;

        if (range > options.real.w) {
            converted.x -= range - options.real.w;
        }

        /*
         *
         * Making sure selection area is inside real image area on vertical
         * axis
         *
         */
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

    /*
     *
     * If there is no selection, there is no origin.
     *
     */
    if (!sel) {
        return;
    }

    if (point.x >= sel.x - mar && point.x <= sel.x + mar) {
        x = 1;
    } else if (point.x >= sel.x + sel.w - mar && point.x <= sel.x + sel.w + mar) {
        x = 0;
    } else if (point.x >= sel.x - mar && point.x <= sel.x + sel.w + mar) {
        x = 0.5;
    }

    if (point.y >= sel.y - mar && point.y <= sel.y + mar) {
        y = 1;
    } else if (point.y >= sel.y + sel.h - mar && point.y <= sel.y + sel.h + mar) {
        y = 0;
    } else if (point.y >= sel.y - mar && point.y <= sel.y + sel.h + mar) {
        y = 0.5;
    }

    return {
        x: x,
        y: y
    };
};

Croptool.prototype.applyOrigin = function ( origin ) {

    var middle = 0.5,
        x,
        y;

    /*
     *
     * If there is no origin, state must be null and no resizing or moving
     * should happen.
     *
     */
    if (typeof origin === 'undefined') {
        this.state = Croptool.STATE_NULL;
        return;
    }

    x = origin.x;
    y = origin.y;

    if (x === middle && y === middle) {
        this.state = Croptool.STATE_MOVE;
        return;
    }

    this.state = Croptool.STATE_RESIZE;

    if (x !== middle && y !== middle) {
        this.direction = Croptool.DIRECTION_BOTH;
    } else if (x !== middle) {
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

    var x,
        y;

    if (!origin) {
        return 'default';
    }

    x = 'x' + origin.x * 100;
    y = 'y' + origin.y * 100;

    return (Croptool.cursors[x] && Croptool.cursors[x][y]) || 'default';
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
        this.drag.end = {
            x: this.selection.x + this.selection.w * origin.x,
            y: this.selection.y + this.selection.h * origin.y
        };

        // used when mode is centered
        this.drag.center = {
            x: this.selection.x + this.selection.w * 0.5,
            y: this.selection.y + this.selection.h * 0.5
        };
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
            this.setDimensions(true, true);
        } else if (this.direction === Croptool.DIRECTION_HORIZONTAL) {
            this.setDimensions(true, false);
        } else {
            this.setDimensions(false, true);
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

Croptool.prototype.setDimensions = function (horizontal, vertical) {

    var options = this.options,
        drag = this.drag,
        diffX,
        diffY,
        ltrX,
        ltrY,
        minW,
        minH,
        maxW,
        maxH,
        x1,
        x2,
        y1,
        y2;

    x1 = drag.point.x;
    y1 = drag.point.y;

    minW = options.min.wp;
    minH = options.min.hp;
    maxW = options.max.wp;
    maxH = options.max.hp;

    if (this.mode === Croptool.MODE_NORMAL) {

        x2 = drag.end.x;
        y2 = drag.end.y;

        ltrX = x1 <= x2;
        ltrY = y1 <= y2;

        diffX = Math.abs(x1 - x2);
        diffY = Math.abs(y1 - y2);

        maxW = ltrX ? Math.min(x2, maxW) : Math.min(1 - x2, maxW);
        maxH = ltrY ? Math.min(y2, maxH) : Math.min(1 - y2, maxH);

        if (diffX > maxW) {
            x1 = ltrX ? x2 - maxW : x2 + maxW;
        }

        if (diffY > maxH) {
            y1 = ltrY ? y2 - maxH : y2 + maxH;
        }

        if (diffX < minW) {
            x1 = ltrX ? x2 - minW : x2 + minW;
        }

        if (diffY < minH) {
            y1 = ltrY ? y2 - minH : y2 + minH;
        }

        if (horizontal) {

            if (ltrX) {
                this.selection.x = x1;
                this.selection.w = x2 - x1;
            } else {
                this.selection.x = x2;
                this.selection.w = x1 - x2;
            }
        }

        if (vertical) {

            if (ltrY) {
                this.selection.y = y1;
                this.selection.h = y2 - y1;
            } else {
                this.selection.y = y2;
                this.selection.h = y1 - y2;
            }
        }

    } else {

        x2 = drag.center.x;
        y2 = drag.center.y;

        ltrX = x1 <= x2;
        ltrY = y1 <= y2;

        diffX = Math.abs(2 * (x1 - x2));
        diffY = Math.abs(2 * (y1 - y2));

        maxW = Math.min(x2 * 2, 2 * (1 - x2), maxW);
        maxH = Math.min(y2 * 2, 2 * (1 - y2), maxH);

        if (diffX > maxW) {
            x1 = ltrX ? x2 - maxW / 2 : x2 + maxW / 2;
        }

        if (diffY > maxH) {
            y1 = ltrY ? y2 - maxH / 2 : y2 + maxH / 2;
        }

        if (diffX < minW) {
            x1 = ltrX ? x2 - minW / 2 : x2 + minW / 2;
        }

        if (diffY < minH) {
            y1 = ltrY ? y2 - minH / 2 : y2 + minH / 2;
        }

        if (horizontal) {

            if (ltrX) {
                this.selection.x = x1;
                this.selection.w = 2 * (x2 - x1);
            } else {
                this.selection.x = 2 * x2 - x1;
                this.selection.w = 2 * (x1 - x2);
            }
        }

        if (vertical) {

            if (ltrY) {
                this.selection.y = y1;
                this.selection.h = 2 * (y2 - y1);
            } else {
                this.selection.y = 2 * y2 - y1;
                this.selection.h = 2 * (y1 - y2);
            }
        }
    }
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