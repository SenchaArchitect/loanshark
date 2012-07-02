/**
 * @private
 * Developer 
 *
 */
Ext.define('Ext.io.Developer', {
    extend: 'Ext.io.Object',
    requires: [
        'Ext.cf.util.Md5', 
        'Ext.cf.util.ErrorHelper'
    ],
    
    statics: {

        /**
         * @static
         * Authenticate developer
         *
         * @param {Object} options
         * @param {String} options.username
         * @param {String} options.password
         *
         * @param {Function} callback The function to be called after authenticating the developer.
         * @param {Object} callback.developer The {Ext.io.Developer} object if the call succeeded.
         * @param {Object} callback.err an error object.
         *
         * @param {Object} scope The scope in which to execute the callback. The "this" object for
         * the callback function.
         */
        authenticate: function(options,callback,scope) {
            var self = this;

            Ext.io.Io.getService(
                {name: "teammanager"},
                function(devService,err) {
                    if(devService){
                        devService.authenticate(function(result) {
                            if (result.status == "success") {
                                var developer = Ext.create('Ext.io.Developer', {id:result.value._key, data:result.value.data});                            
                                Ext.io.Io.getIdStore().setSid('developer', result.session.sid);
                                Ext.io.Io.getIdStore().setId('developer', result.value._key);
                                callback.call(scope,developer);
                            } else {
                                callback.call(scope,undefined,result.error);
                            }
                        }, {username : options.username, password : Ext.cf.util.Md5.hash(options.password), provider:"sencha"});
                    }else{
                        callback.call(scope,undefined,err);
                    }
                },
                this
            );
        },

        /**
         * @static
         * Get current developer
         *
         * @param {Function} callback The function to be called after getting the current Developer object.
         * @param {Object} callback.developer The current {Ext.io.Developer} object if the call succeeded.
         * @param {Object} callback.err an error object.
         *
         * @param {Object} scope The scope in which to execute the callback. The "this" object for
         * the callback function.
         */
        getCurrent: function(callback,scope) {
            var developerId = Ext.io.Io.getIdStore().getId('developer');
            if (!developerId) {
                var err = { code : 'NOT_LOGGED', message: 'Developer is not logged in' };
                callback.call(scope,undefined,err);
            } else {
                this.getObject(developerId, callback, scope);
            }
        },

        /**
         * @static
         * Get Developer
         *
         * @param {Object} options
         * @param {String} options.id
         *
         * @param {Function} callback The function to be called after getting the current Developer object.
         * @param {Object} callback.developer The {Ext.io.Developer} object if the call succeeded.
         * @param {Object} callback.err an error object.
         *
         * @param {Object} scope The scope in which to execute the callback. The "this" object for
         * the callback function.
         */
        get: function(options,callback,scope) {
            this.getObject(options.id, callback, scope);
        }
    },

    /**
     * Get Teams
     *
     * @param {Object} options
     *
     * @param {Function} callback The function to be called after getting the Developer's teams.
     * @param {Object} callback.teams The {Ext.io.Team[]} teams of the developer if the call succeeded.
     * @param {Object} callback.err an error object.
     *
     * @param {Object} scope The scope in which to execute the callback. The "this" object for
     * the callback function.
     */
    getTeams: function(options,callback,scope) {
        var tag = (typeof(options.owner) != "undefined") ? ((options.owner) ? 'owner' : 'member') : null;
        this.getRelatedObjects(Ext.io.Team, tag, callback, scope);
    },

    /**
     * Create Team
     *
     * @param {Object} options
     *
     * @param {Function} callback The function to be called after creating a team.
     * @param {Object} callback.team The {Ext.io.Team} object if the call succeeded.
     * @param {Object} callback.err an error object.
     *
     * @param {Object} scope The scope in which to execute the callback. The "this" object for
     * the callback function.
     */
    createTeam: function(options,callback,scope) {
        this.createRelatedObject("createTeam", Ext.io.Team, options, callback, scope);
    },

    /**
     * Logout
     *
     */
    logout: function() {
        Ext.io.Io.getIdStore().remove('developer','sid');
        Ext.io.Io.getIdStore().remove('developer','id');
    }
    
});