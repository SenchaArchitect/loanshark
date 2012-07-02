    /** 
     * @private
     *
     * A directory of stores in local storage.
     *
     */
    Ext.define('Ext.io.data.Directory', {
        requires: [
            'Ext.data.Store',
            'Ext.io.data.DirectoryModel',
            'Ext.data.Batch' /* EXTJS */
        ],
        store: undefined,
        
        /**
         * @private
         *
         * Constructor
         *
         * @param {Object} config
         *
         */
        constructor: function(config) {
            this.store = Ext.create('Ext.data.Store', {
                model: 'Ext.io.data.DirectoryModel',
                sorters: [
                    {
                        property : 'name',
                        direction: 'ASC'
                    }               
                ],
                autoLoad: true,
                autoSync: true
            });
        },

        /**
         * Get Store
         *
         * @param {String} name
         *
         * @return {Object} Store
         *
         */
        get: function(name) {
            var index = this.store.find("name", name);
            if(index == -1) { // not found
                return null;
            } else {
                return this.store.getAt(index).data;
            }
        },

        /**
         * Get all stores
         *
         * @return {Array} Stores
         *
         */
        getAll: function() {
            var entries = this.store.getRange();
            var all = [];

            for(var i = 0; i < entries.length; i++) {
                all[i] = entries[i].data;   
            }

            return all;
        },

        /**
         * Get each store entry
         *
         * @param {Function} callback
         * @param {Object} scope
         *
         * @return {Object} Store entry
         *
         */
        each: function(callback, scope) {
          this.store.each(function(entry) {
              return callback.call(scope || entry.data, entry.data);
          }, this);  
        },

        /**
         * Add new store entry
         *
         * @param {String} name
         * @param {String} type
         * @param {String} meta
         *
         */
        add: function(name, type, meta) {
            var entry = Ext.create('Ext.io.data.DirectoryModel', {
                name: name,
                type: type,
                meta: meta
            });

            this.store.add(entry);
        },

        /**
         * Update store
         *
         * @param {String} name
         * @param {String} type
         * @param {String} meta
         *
         */
        update: function(name, type, meta) {
            var index = this.store.find("name", name);
            if(index == -1) { // not found
                this.add(name, type, meta);
            } else {
               var record = this.store.getAt(index);
               record.set("type", type);
               record.set("meta", meta);
               record.save();
            }
        },

        /**
         * Remove store
         *
         * @param {String} name
         *
         */
        remove: function(name) {
            var index = this.store.find("name", name);
            if(index != -1) {
                this.store.removeAt(index);
            }

            return index;
        }
    });

