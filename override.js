Ext.dom.Element.override({
    getXY: function() {
        var rect = this.dom.getBoundingClientRect(),
            round = Math.round;

        return [round(rect.left + window.pageXOffset), round(rect.top + window.pageYOffset)];
    }
});

if (Ext.os.is.Android4 && Ext.browser.is.Chrome) {
    Ext.viewport.Android.override({
        getWindowHeight: function() {
            return window.outerHeight;
        }
    });

    Ext.os.is.Android2 = true;

    Ext.event.recognizer.Tap.override({
        onTouchStart: function(e) {
            if (Ext.event.recognizer.Tap.superclass.onTouchStart.apply(this, arguments) === false) {
                return false;
            }

            this.startPoint = e.changedTouches[0].point;
        },

        onTouchMove: function(e) {
            var touch = e.changedTouches[0],
                point = touch.point;

            if (Math.abs(point.getDistanceTo(this.startPoint)) >= 15) {
                return this.fail(this.self.TOUCH_MOVED);
            }
        }
    });

    Ext.viewport.Default.override({
        applyAutoBlurInput: function(autoBlurInput) {
            var touchstart = (Ext.feature.has.Touch) ? 'touchend' : 'mouseup';

            if (autoBlurInput) {
                this.addWindowListener(touchstart, this.doBlurInput, false);
            }
            else {
                this.removeWindowListener(touchstart, this.doBlurInput, false);
            }

            return autoBlurInput;
        }
    });

    Ext.define('MainViewOverride', {
        override: 'Payback.view.MainView',
        config: {
            layout: {
                type: 'card',
                animation: false
            }
        }
    });
}

