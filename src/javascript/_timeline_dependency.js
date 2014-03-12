Ext.define('DependencyTimeline',{
    extend: 'Rally.alm.ui.timeline.Timeline',
    alias:"widget.tsdependencytimeline",
    constructor: function(config) {
        this.initConfig(config);
 

        var dependencyStore = Ext.create("Gnt.data.DependencyStore", {
            autoLoad    : true,
            proxy       : {
                type    : 'memory',
                reader  : {
                    type: 'json'
                },
                data: [ ]
            }
        });
        
        this.dependencyStore = config.dependencyStore = dependencyStore;
        
        this.callParent(arguments);
    },
    _onLoaded: function(taskStore, model, records) {
        var me = this;
        Ext.Array.each(records, function(record) { record.set('Id',record.get('ObjectID')) ; } );
        
        var promises = [];
        Ext.Array.each(records, function(record) {
            var object_id = record.get('ObjectID');
            record.set('Id',object_id);
            promises.push(me._getDependencies(object_id));
        });

        Deft.Promise.all(promises).then({
            scope: this,
            success: function(records) {
                var dependencies = Ext.Array.flatten(records);
                this.dependencyStore.loadRawData(dependencies);
            },
            failure: function(error) {
                alert(error);
            }
        });
        this.callParent(arguments);
    },
    _getDependencies: function(object_id){
        var deferred = Ext.create('Deft.Deferred');
        Ext.create('Rally.data.wsapi.Store',{
            autoLoad: true,
            model:'UserStory',
            filters: [{property:'Feature.ObjectID',value:object_id}],
            fetch: ['ObjectID','Predecessors','Feature'],
            listeners: {
                scope: this,
                load: function(store,stories) {
                    var me = this; 
                    var promises = [];
                    Ext.Array.each(stories, function(story) {
                        if ( story.get('Predecessors').Count != 0 ) {
                            promises.push(me._getCollectionFromRecord(story,'Predecessors'));
                        }
                    });
                    if ( promises.length > 0 ) {
                        Deft.Promise.all(promises).then({
                            scope: this,
                            success: function(records) {
                                deferred.resolve(records);
                            },
                            failure: function(error) {
                                deferred.reject(error);
                            }
                        });
                    } else {
                        deferred.resolve([]);
                    }
                }
            }
        });
        return deferred.promise;
    },
    _getCollectionFromRecord: function(story,field_name) {
        var deferred = Ext.create('Deft.Deferred');
        story.getCollection(field_name).load({
            fetch: ['Feature','ObjectID','Blocked'],
            callback: function(predecessors,operation,success){
                var dependencies = [];
                Ext.Array.each(predecessors,function(predecessor){
                    if ( predecessor.get('Feature') ) {
                        var from_oid = predecessor.get('Feature').ObjectID;
                        var to_oid = story.get('Feature').ObjectID;
                        if ( from_oid !== to_oid ) {
                            var class_name = "dependency";
                            if ( predecessor.get('Blocked')) {
                                class_name = "dependency-blocked";
                            }
                            dependencies.push({
                                "Cls": class_name,
                                "From":from_oid,
                                "To"  :to_oid,
                                "Type":3
                            });
                        }
                    }
                });
                deferred.resolve(dependencies);
            }
        });        
        return deferred.promise;
    }
});