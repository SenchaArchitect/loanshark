/**
 * 
 * @private
 *
 * Eventually Consistent Object
 *
 * It's an object of name-value-changestamp tuples,
 * A value can be of a simple or complex type.
 * Complex types are either an Object or an Array
 */
Ext.define('Ext.cf.ds.ECO', {
    requires: [
        'Ext.cf.ds.CSV',
        'Ext.cf.ds.CS'
    ],

    /** 
     * Constructor
     *
     * @param {Object} config
     *
     */
    constructor: function(config) {
        config= config||{};
        this.oid= config.oid;
        this.data= config.data||{};
        this.state= config.state||{};
    },

    /** 
     * Set oid
     *
     * @param {String} oid
     *
     */
    setOid: function(oid) {
        this.oid= oid;  
    },

    /** 
     * Get oid
     *
     * @return {String} oid
     *
     */
    getOid: function() {
        return this.oid;
    },

    /** 
     * Get state
     *
     * @return {Object} state
     *
     */
    getState: function() {
        return this.state;
    },

    /**
     * Get the value for the path
     *
     * @param {Object} path
     *
     */
    get: function(path) {
        return this.getValue(path);
    },

    /**
     * Set the value for a path, with a new change stamp.
     *
     * @param {String/Array} path
     * @param {Object} value
     * @param {Ext.cf.data.Transaction} t
     *
     * @return {Boolean} True/False
     *
     */
    set: function(path,value,t) {
        var updates= this.valueToUpdates(path,value);
        var l= updates.length;
        for(var i=0;i<l;i++) {
            var update= updates[i];
            this.setValueCS(t,update.n,update.v,t.generateChangeStamp());
        }
    },

    /**
     * Apply an update to this Object.
     *
     * @param {Ext.cf.data.Transaction} t
     * @param {Object} update
     *
     * @return {Boolean} True/False
     *
     */
    applyUpdate: function(t,update) {
        return this.setValueCS(t,update.p,update.v,update.c);
    },

    /**
     * Get all the updates that have occured since CSV.
     *
     * @param {Ext.cf.ds.CSV} csv
     *
     * @return {Array} updates
     *
     */
    getUpdates: function(csv) {
        var updates= []; // JCM should be Ext.x.Updates?
        this.forEachValueCS(function(path,values,cs){
            if (cs) {
                var cs2= csv.get(cs);
                if (!cs2 || cs2.lessThan(cs)) {
                    updates.push({
                        i: this.getOid(),
                        p: path.length==1 ? path[0] : path, 
                        v: values.length==1 ? values[0] : values, 
                        c: cs
                    });
                }
            }
        },this);
        return updates;
    },

    /**
     * Get a CSV for this Object.
     *
     * @return {Ext.cf.ds.CSV} csv
     *
     */
    getCSV: function() {
        var csv= Ext.create('Ext.cf.ds.CSV');
        this.forEachCS(function(cs) {
            csv.addCS(cs);
        },this);
        return csv;
    },

    /**
     * Get a list of all the Change Stamps in this Object.
     *
     * @return {Array}
     *
     */
    getAllCS: function() {
        var r= [];
        this.forEachCS(function(cs) {
            r.push(new Ext.cf.ds.CS(cs));
        },this);
        return r;
    },

    /**
     * Change a replica number.
     *
     * @param {String} idProperty
     * @param {Number} old_replica_number
     * @param {Number} new_replica_number
     *
     */
    changeReplicaNumber: function(idProperty,old_replica_number,new_replica_number) {
        var changed= false;
        this.forEachCS(function(cs) {
            var t= cs.changeReplicaNumber(old_replica_number,new_replica_number);
            changed= changed || t;
            return cs;
        },this);
        if (this.oid) {
            var id_cs= Ext.create('Ext.cf.ds.CS',this.oid);
            if (id_cs.changeReplicaNumber(old_replica_number,new_replica_number)) {
                var oid= id_cs.asString();
                this.data[idProperty]= oid; // warning: don't call record.set, it'll cause an update after the add
                this.oid= id_cs.asString();
                changed= true;
            }
        }
        return changed;
    },

    /**
     * For each Value and Change Stamp of this Object.
     *
     * @param {Function} callback
     * @param {Object} scope
     * @param {Object} data
     * @param {Object} state
     * @param {String/Array} path
     * @param {Array} values
     *
     */
    forEachValueCS: function(callback,scope,data,state,path,values) {
        data= data||this.data;
        state= state||this.state;
        path= path||[];
        values= values||[];
        //console.log('forEachPair',Ext.encode(data),Ext.encode(state),Ext.encode(path),Ext.encode(values));
        for(var name in state) {
            if (state.hasOwnProperty(name)) {
                var new_state= state[name];
                var new_data= data[name];
                var new_path= path.concat(name);
                var new_data_type= this.valueType(new_data);
                var new_value;
                switch (new_data_type) {
                    case 'object':
                        switch(new_data){
                            case undefined:
                                new_value= undefined;
                                break;
                            case null:
                                new_value= null;
                                break;
                            default:
                                new_value= {};
                                break;
                            }
                        break;
                    case 'array':
                        new_value= [[]];
                        break;
                    default:
                        new_value= new_data;
                }
                var new_values= values.concat(new_value);
                switch (this.valueType(new_state)) {
                    case 'string':
                        callback.call(scope,new_path,new_values,new Ext.cf.ds.CS(new_state));
                        break;
                    case 'array':
                        switch (new_data_type) {
                            case 'undefined':
                                Ext.cf.util.Logger.wraning('ECO.forEachValueCS: There was no data for the state at path',new_path);
                                Ext.cf.util.Logger.wraning('ECO.forEachValueCS: ',Ext.encode(this.data));
                                break;
                            case 'object':
                            case 'array':
                                callback.call(scope,new_path,new_values,new Ext.cf.ds.CS(new_state[0])); // [cs,state]
                                this.forEachValueCS(callback,scope,new_data,new_state[1],new_path,new_values); // [cs,state]
                                break;
                            default:
                                callback.call(scope,new_path,new_values,new Ext.cf.ds.CS(new_state[0])); // [cs,state]
                                break;
                        }
                    break;
                }
            }
        }
    },  
    
    /**
     * @private
     *
     * For each Value of this Object.
     *
     * @param {Function} callback
     * @param {Object} scope
     * @param {Object} data
     * @param {String/Array} path
     *
     */
    forEachValue: function(callback,scope,data,path) {
        data= data || this.data;
        path= path || [];
        var n, v;
        for(n in data) {
            if (data.hasOwnProperty(n)) {
                v= data[n];
                if (v!==this.state) {
                    var path2= path.concat(n);
                    callback.call(scope,path2,v);
                    if (this.isComplexValueType(v)) {
                        this.forEachValue(callback,scope,v,path2);
                    }
                }
            }
        }
    },


    /**
     * @private
     *
     * For each Change Stamp of this Object
     *
     * @param {Function} callback
     * @param {Object} scope
     * @param {Object} state
     *
     */
    forEachCS: function(callback,scope,state) {
        state= state || this.state;
        for(var name in state) {
            if (state.hasOwnProperty(name)) {
                var next_state= state[name];
                var cs;
                switch (this.valueType(next_state)) {
                    case 'string':
                        cs= callback.call(scope,Ext.create('Ext.cf.ds.CS',next_state));
                        if (cs) { state[name]= cs.asString(); }
                        break;
                    case 'array':
                        cs= callback.call(scope,Ext.create('Ext.cf.ds.CS',next_state[0]));
                        if (cs) { state[name][0]= cs.asString(); } // [cs,state]
                        this.forEachCS(callback,scope,next_state[1]); // [cs,state]
                        break;
                }
            }
        }
    },


    /**
     * @private
     * 
     * Return Value and Change Stamp for the path, {v:value, c:cs}
     *
     * @param {String/Array} path
     *
     */
    getValueCS: function(path) {
        var data= this.data;
        var state= this.state;
        if (Ext.isArray(path)) {
            var l= path.length;
            var e= l-1;
            for(var i=0;i<l;i++) {
                var name= path[i];
                if (i===e) {
                    return {
                        v: data ? data[name] : data,
                        c: this.extractCS(state,name)
                    };
                } else {
                    state= this.extractState(state,name);
                    data= data ? data[name] : data;
                }
            }
        } else {
            return {
                v: data[path],
                c: this.extractCS(state,path)
            };
        }
    },

    /**
     * @private
     *
     * Get value
     *
     * @param {String/Array} path
     *
     */
    getValue: function(path) {
        var data= this.data;
        if (Ext.isArray(path)) {
            var l= path.length;
            var e= l-1;
            for(var i=0;i<l;i++) {
                var name= path[i];
                if (i===e) {
                    return data[name];
                } else {
                    data= data[name];
                }
            }
        } else {
            return this.data[path];
        }
    },

    /**
     * @private
     *
     * Set value of CS
     *
     * @param {Ext.cf.data.Transaction} t
     * @param {String/Array} path
     * @param {Array} values
     * @param {Ext.cf.ds.CS} new_cs
     *
     * @return {Boolean} True/False
     *
     */
    setValueCS: function(t,path,values,new_cs) {
        var self= this;

        //console.log('setValue',Ext.encode(path),Ext.encode(values),Ext.encode(new_cs));
        //console.log('setValue',Ext.encode(this.data));
    
        var assignValueCS= function(t,data,state,name,value,to_cs) {
            var changed= false;
            if (value!==undefined) {
                data[name]= value;
                changed= true;
            }
            if (to_cs!==undefined) {
                var from_cs= self.extractCS(state,name);
                self.assignCS(state,name,to_cs);
                t.updateCS(from_cs,to_cs,self.getOid());
                changed= true;
            }
            return changed;
        };

        var changed= false;
        if (!Ext.isArray(path)) {
            path= [path];
            values= [values];
        }
        var data= this.data;
        var state= this.state;
        var l= path.length;
        var e= l-1;
        for(var i=0;i<l;i++) {
            var name= path[i];
            var new_value= values[i]; 
            var old_cs= this.extractCS(state,name);
            var old_value= data[name];
            var old_value_type= this.valueType(old_value);
            var new_value_type= this.valueType(new_value);
            var sameComplexType= 
                ((old_value_type==='object' && new_value_type==='object') ||
                (old_value_type==='array' && new_value_type==='array'));
            if (old_cs) {
                if (new_cs.greaterThan(old_cs)) {
                    if (sameComplexType) {
                        new_value= undefined; // re-assert, don't overwrite
                    }
                    // new_cs is gt old_cs, so accept update
                    if (assignValueCS(t,data,state,name,new_value,new_cs)) {
                        changed= true;
                    }
                } else {
                    // new_cs is not gt old_cs
                    if (sameComplexType) {
                        // but this value type along the path is the same, so keep going... 
                    } else {
                        // and this type along the path is not the same, so reject the update.
                        return changed;
                    }
                }
            } else {
                // no old_cs, so accept update
                if (assignValueCS(t,data,state,name,new_value,new_cs)) {
                    changed= true;
                }
                //console.log('X',new_cs,'no old',data,state)
            }
            if (i!==e) {
                data= data[name];
                state= this.extractState(state,name,new_cs);
            }
        }
        //console.log('setValue => ',Ext.encode(this.data));
        return changed;
    },

    /**
     * @private
     *
     * Get the Change Stamp for the path
     *
     * @param {String/Array} path
     *
     */
    getCS: function(path) {
        var state= this.state;
        if (Ext.isArray(path)) {
            var l= path.length;
            var e= l-1;
            for(var i=0;i<l;i++) {
                var name= path[i];
                if (i===e) {
                    return this.extractCS(state,name);
                } else {
                    state= this.extractState(state,name);
                }
            }
        } else {
            return this.extractCS(state,path);
        }
    },
    
    /**
     * @private
     *
     * Set the Change Stamp for the Path.
     *
     * @param {Ext.cf.data.Transaction} t
     * @param {String/Array} path
     * @param {Ext.cf.ds.CS} cs
     *
     */
    setCS: function(t,path,cs) {
        var self= this;

        var setNameCS= function(t,state,name,to_cs) {
            var from_cs= self.extractCS(state,name);
            self.assignCS(state,name,to_cs);
            t.updateCS(from_cs,to_cs,self.getOid());
        };

        var state= this.state;
        if (Ext.isArray(path)) {
            var l= path.length;
            var e= l-1;
            for(var i=0;i<l;i++) {
                var name= path[i];
                if (i===e) {
                    setNameCS(t,state,name,cs);
                } else {
                    state= this.extractState(state,name);
                }
            }
        } else {
            setNameCS(t,state,path,cs);
        }
    },

    /**
     * @private
     *
     * Extract the next state for this name from the state
     *
     * @param {Object} state
     * @param {String} name
     * @param {Ext.cf.ds.CS} cs
     *
     * @return {Object} state
     *
     */
    extractState: function(state,name,cs) {
        var next_state= state[name];
        var new_state;
        switch (this.valueType(next_state)) {
            case 'undefined':
                new_state= {};
                state[name]= [cs,new_state];
                state= new_state;
                break;
            case 'string':
                new_state= {};
                state[name]= [next_state,new_state];
                state= new_state;
                break;
            case 'array':
                state= next_state[1];
                break;
        }
        return state;
    },

    /**
     * @private
     * 
     * Extract the Change Stamp from the state for this name
     *
     * @param {Object} state
     * @param {String} name
     *
     * @return {Object}
     *
     */
    extractCS: function(state,name) {
        var cs;
        state= state[name];
        if (state) {
            switch (this.valueType(state)) {
                case 'string':
                    cs= new Ext.cf.ds.CS(state);
                    break;
                case 'array':
                    cs= new Ext.cf.ds.CS(state[0]); // [cs,state]
                    break;
            }
        } // else undefined
        return cs;
    },

    /**
     * @private
     *
     * Assign the Change Stamp for this name
     *
     * @param {Object} state
     * @param {String} name
     * @param {Ext.cf.ds.CS} cs
     *
     */
    assignCS: function(state,name,cs) {
        var cs_s= (cs instanceof Ext.cf.ds.CS) ? cs.asString() : cs;
        var state2= state[name];
        if (state2) {
            switch (this.valueType(state2)) {
                case 'string':
                    state[name]= cs_s;
                    break;
                case 'array':
                    state2[0]= cs_s; // [cs,state]
                    break;
            }
        } else {
            state[name]= cs_s;
        }
    },

    /**
     * @private
     *
     * Returns undefined, number, boolean, string, object, array.
     *
     * @param {Array/Object} value
     *
     * @return {String} typeof value
     *
     */
    valueType: function(value) { // 
        var t= typeof value;
        if (t==='object' && (value instanceof Array)) {
            t= 'array';
        }
        return t;
    },
    
    /**
     * @private
     *
     * Returns true for an object or an array.
     *
     * @param {Array/Object} value
     *
     * @return {Boolean} True/False
     *
     */
    isComplexValueType: function(value) {
        return (value!==null && typeof value==='object');
    },

    /** 
     * @private
     *
     * Create a list of updates from a value, either simple or complex.
     *
     * @param {String} name
     * @param {Array/Object} value
     *
     * @return {Object}
     *
     */
    valueToUpdates: function(name,value) {
        if(this.isComplexValueType(value)) {
            var parent_value;
            switch(this.valueType(value)) {
                case 'object':
                    parent_value= {};
                    break;
                case 'array':
                    parent_value= [];
                    break;
            }
            var parent_update= {n: [name], v: [parent_value]};
            var updates= [parent_update];
            for(var key in value) {
                if (value.hasOwnProperty(key)) {
                    var children= this.valueToUpdates(key,value[key]);
                    var l= children.length;
                    for(var i=0;i<l;i++){
                        update= children[i];
                        updates= updates.concat({n:parent_update.n.concat(update.n),v:parent_update.v.concat(update.v)});
                    }
                }
            }
            return updates;
        } else {
            return [{n: name, v: value}];
        }
    }
        
});

