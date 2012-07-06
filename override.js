Ext.dom.Element.override({
    getXY: function() {
        var rect = this.dom.getBoundingClientRect(),
            round = Math.round;

        return [round(rect.left + window.pageXOffset), round(rect.top + window.pageYOffset)];
    }
});

//fixes android chrome bugs
if (Ext.os.is.Android4 && Ext.browser.is.Chrome) {
	
	//fixes 2 pixel spacing at bottom of screen
	Ext.viewport.Android.override({
		getWindowHeight: function() {
			return window.outerHeight;
		}
	});
	
	//Removes 3d rendering,
	Ext.os.is.Android2 = true;
	
	//fixes keyboard issues on chrome
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
	
	//fixes keyboard issues on chrome
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
	
	//sets android card animation to false
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