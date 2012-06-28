if (Ext.os.is.Android4 && Ext.browser.is.Chrome) {
	Ext.Viewport.override({
		getWindowHeight: function() {
			return window.outerHeight;
		}
	})
}