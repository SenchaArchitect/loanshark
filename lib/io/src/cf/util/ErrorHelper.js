/**
 * @private
 */
Ext.define('Ext.cf.util.ErrorHelper', {
	requires: ['Ext.cf.util.Logger', 'Ext.io.Errors'],

	statics: {
		/**
		* A valid error object MUST have at minimum a 'code' and 'message'
		*
		* @param {Object} error
		*
		*/
		isValidError: function(err) {
			if(typeof(err) === "object" && 
				err !== null &&  
				typeof(err.code) === "string" &&
				typeof(err.message) === "string") {

				return true;
			}

			return false;
		},

		/**
		* Get error
		*
		* @param {String} code
		* @param {String} details
		* @param {Array} params
		*
		*/
		get: function(code, details, params) {
			var err = Ext.clone(Ext.io.Errors[code] ? Ext.io.Errors[code] : Ext.io.Errors['UNKNOWN_ERROR']);
			
			if(details) {
				err.details = details;
			}

			for(key in params) {
				if(params.hasOwnProperty(key)) {
					err.message = err.message.replace(":" + key, params[key]);
				}
			}

			return err;
		},

		/**
		* Get error object for 'UNKNOWN_ERROR'
		*
		* @param {String} details
		*
		*/
		getUnknownError: function(details) {
			var unknownError = this.get('UNKNOWN_ERROR');
			unknownError.details = details;
			return unknownError;
		},

		/**
		* Decode error
		*
		* @param {Object} error
		*
		*/
		decode: function(err) {
			if(err === null || err === "null" || err === "") {
				return null;
			}

			// if already an error object, return as is
			if(this.isValidError(err)) {
				return err;
			}

			try {
				err = Ext.decode(err);
				if(this.isValidError(err)) {
					return err;
				} else {
					Ext.cf.util.Logger.debug('Could not decode error:', err);
					return this.getUnknownError(err);
				}
			} catch(e) {
				Ext.cf.util.Logger.debug('Could not decode error:', err);
				return this.getUnknownError(err);
			}
		}
	}
});