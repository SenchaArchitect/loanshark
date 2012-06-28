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
	})
}