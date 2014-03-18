/**
 * The portfolio item timeline component with type filter.
 */
Ext.define('Rally.alm.ui.timeline.PortfolioItemTimeline', {
    extend:'Ext.container.Container',
    requires:[
        'Rally.util.DateTime',
        'Rally.util.Test',
        'Rally.ui.ButtonSlider',
        'Rally.util.HealthColorCalculator',
        'Rally.ui.EmptyTextFactory',
        'Rally.alm.ui.timeline.Timeline',
        'DependencyTimeline'
    ],
    alias: 'widget.almportfolioitemtimeline',

    clientMetrics: [
        {
            event: 'beforeexpandnode',
            description: 'PI timeline node expanded'
        }
    ],

    config:{
        estimatedStartDateField:"PlannedStartDate",
        estimatedEndDateField:"PlannedEndDate",
        actualStartDateField:"ActualStartDate",
        actualEndDateField:"ActualEndDate",
        childCountField:'DirectChildrenCount',
        piTypeField:'PortfolioItemType',
        piTypeOrdinalValueField:'Ordinal',

        /**
         * @cfg {Boolean} fullScreen tell the component to monitor window resize events and resize to fill all available space
         */
        fullScreen:false,
        /**
         * @cfg {String} type The current PortfolioItem Type that will be shown
         */
        /**
         * @cfg {String} The current zoom level that will be shown.
         */
        zoomLevel:'year',
        /**
         * @cfg {String}
         * the type to default the type dropdown to
         */
        type: undefined,

        /**
         * @cfg {String}
         * the optional query - allows a custom query to be added to filters sent to the WSAPI proxy
         */
        customQueryString: ''
    },

    zoomLevels: ['year', 'monthAndYear', 'rallyWeekAndMonth'],

    emptyTextTpl: ['<p>There are no {selectedType}(s) with current dates. <a href="#/portfolioitems">Manage Portfolio Items</a></p>',
        '<p>Rally Portfolio Manager allows you to plan and track longer-term initiatives, ',
        'with actual progress information rolling up from development teams. ',
        '{[Rally.alm.util.Help.getLinkTag({id: "224", text: "Learn more"})]} ',
        'about configuring Rally Portfolio Manager and best practices for creating Portfolio Items.</p>'],

    constructor: function(config) {

        this.config.taskStoreConfig = {
            startDate: Rally.util.DateTime.add(new Date(), Ext.Date.YEAR, -1),
            endDate: Rally.util.DateTime.add(new Date(), Ext.Date.YEAR, 1),
            skipWeekendsDuringDragDrop:false,
            weekendsAreWorkdays:true,
            sorters:[
                {
                    property:'PlannedStartDate',
                    direction:'ASC'
                },
                {
                    property: 'PlannedEndDate',
                    direction:'ASC'
                }
            ]
        };

        var conf = Ext.merge({}, this.config, config);

        this.initConfig(conf);
        this.callParent([conf]);
    },

    initComponent:function () {
        this.callParent(arguments);
        this.addEvents(
            /**
             * @event
             * Fires when the timeline has loaded.
             * @param {Rally.alm.ui.timeline.PortfolioItemTimeline} this
             */
            'load',
            /**
             * @event
             * Fires when the type combobox changes.
             * @param {Rally.alm.ui.timeline.PortfolioItemTimeline} this
             */
            'typeChange'
        );
        this.on('afterrender', this._onAfterRender, this);

        if (this.getFullScreen()) {
            Ext.EventManager.onWindowResize(this._resizeTimelineToFit, this);
        }
    },

    /**
     * Resize the timeline to fill the available area when the window resizes
     */
    _resizeTimelineToFit:function (windowWidth, windowHeight) {
        /* don't let the timeline shrink away to nothing on small resolutions */
        var minHeight = 250;

        if (!this.timeline || !this.timeline.el) {
            return;
        }

        if (!Ext.isDefined(windowWidth)) {
            windowWidth = Ext.getBody().getWidth();
        }
        if (!Ext.isDefined(windowHeight)) {
            windowHeight = Ext.getBody().getHeight();
        }

        var timelineRegion = Ext.util.Region.getRegion(this.timeline.el);

        var legendHeight = this.down('#timelineLegend').getHeight() + 200;

        //need to know the footer height to know how much space we have
        var footerHeight = Ext.get('footer').getHeight();
        var devFooter = Ext.get('devFooter');
        if (devFooter) {
            footerHeight += devFooter.getHeight();
        }

        var height = windowHeight - timelineRegion.top - legendHeight - footerHeight;

        if (height < minHeight) {
            height = minHeight;
        }

        this.timeline.setHeight(height);

        this.timeline.setWidth(windowWidth - 20);

    },

    _resizeTimelineHeight:function (windowHeight) {
        /* don't let the timeline shrink away to nothing on small resolutions */
        var minHeight = 250;

        if (!this.timeline || !this.timeline.el) {
            return;
        }

        if (!Ext.isDefined(windowHeight)) {
            windowHeight = Ext.getBody().getHeight();
        } 

        var legendHeight = this.down('#timelineLegend').getHeight() + 50;

        //need to know the footer height to know how much space we have
        var footerHeight = 0;
        if ( Ext.get('footer') ) {
            footerHeight = Ext.get('footer').getHeight();
        }
//        var devFooter = Ext.get('devFooter');
//        if (devFooter) {
//            footerHeight += devFooter.getHeight();
//        }

          var height = windowHeight - legendHeight - footerHeight;
//          var height = windowHeight - timelineRegion.top - legendHeight - footerHeight;
//
        if (height < minHeight) {
            height = minHeight;
        }
        
        this.timeline.setHeight(height);

    },

    _onAfterRender:function () {
        this.typeComboBox = this._createTypeComboBox();

        
//        this.getEl().on('click', function (event, el) {
//            el = Ext.get(el);
//            var record = this._getRecordFor(el, this.timeline.getSchedulingView());
//            Ext.create('Rally.ui.popover.PercentDonePopover', {
//                target: el,
//                percentDoneData: record.data,
//                percentDoneName: 'PercentDoneByStoryCount',
//                piRef: record.data._ref,
//                viewportPadding: [15,25,15,215]
//            });
//        }, this, {
//            delegate: '.sch-gantt-baseline-item'
//        });
    },

    _onModelsRetrieved:function (models) {
        this.models = models;
        this._createHeader();
        this._updateTimelineData();
        this._createLegend();
    },

    _createHeader: function(){
        var items = [{
            xtype: 'component',
            flex: 1
        }];

        items = items.concat(this._createZoomComponentItems());

        items.push(this.typeComboBox);

        var header = Ext.create('Ext.container.Container', {
            itemId: 'timelineHeader',
            items: items,
            layout: {
                type: 'hbox',
                align: 'middle'
            }
        });

        this.add(header);
    },

    _createLegend: function(){

        var tpl = Ext.create('Ext.XTemplate',
                '<b><span class="legend-text">Legend</span></b>',
                '<div><span class="legend-item planned"></span><span class="legend-text">Planned</span></div>',
                '<div><span class="legend-item" style="background-color: {late-color}"></span><span class="legend-text">Late</span></div>',
                '<div><span class="legend-item" style="background-color: {at-risk-color}"></span><span class="legend-text">At Risk</span></div>',
                '<div><span class="legend-item" style="background-color: {on-track-color}"></span><span class="legend-text">On Track</span></div>',
                '<div><span class="legend-item" style="background-color: {complete-color}"></span><span class="legend-text">Complete</span></div>'
        );

        this.add({
            xtype: 'component',
            itemId: 'timelineLegend',
            cls: 'timelineLegend',
            renderTpl: tpl,
            renderData: {
                'late-color': Rally.util.HealthColorCalculator.colors.red.hex,
                'at-risk-color': Rally.util.HealthColorCalculator.colors.yellow.hex,
                'on-track-color': Rally.util.HealthColorCalculator.colors.green.hex,
                'complete-color': Rally.util.HealthColorCalculator.colors.gray.hex
            }
        });
    },

    _createZoomComponentItems: function() {
        var me = this;
        return [
            {
                xtype: 'label',
                text: 'Zoom',
                cls: 'rui-label'
            },
            {
                xtype: 'rallybuttonslider',
                cls: 'zoom-component',
                itemId:'zoomButtonSlider',
                
                sliderConfig:{
                    value:this.getSliderValueFromZoom(this.getZoomLevel()),
                    increment:1,
                    minValue:0,
                    maxValue:this.zoomLevels.length-1,//0 based
                    useTips:false,
                    listeners:{
                        change:function (slider, newValue) {
                            this.zoom(newValue);
                        },
                        scope: this
                    }
                }
            }
        ];
    },

    /**
     * Sets the zoom slider without firing the changed event
     * @param zoom{Number/String}
     */
    setZoomSliderValue:function(zoom){
        if (!this.rendered) {
            return;
        }
        var zoomIndex = Ext.isString(zoom)?this.getSliderValueFromZoom(zoom):zoom;
        var slider = this.down("#zoomButtonSlider");
        if (!slider) {
            return;
        }

        var originalValue = slider.getValue();

        slider.suspendEvents();
        slider.setValue(zoomIndex);
        slider.resumeEvents();

        if(originalValue === slider.getValue()){
            this.zoom(zoomIndex);
        }

    },

    setZoomLevel: function (zoomLevel) {
        this.zoomLevel = zoomLevel || this.getDefaultZoomLevel();
        this.setZoomSliderValue(this.zoomLevel);
    },

    getZoomLevel: function () {
        return this.zoomLevel || this.getDefaultZoomLevel();
    },
    _createTypeComboBox: function() {        
        var typeComboBox = Ext.create('Ext.container.Container',{ tpl: " <tpl>{Name}</tpl>"});
        
        Ext.create('Rally.data.wsapi.Store',{
            model: 'TypeDefinition',
            sorters:{
                property:'Ordinal',
                direction:'Asc'
            },
            limit: 2,
            pageSize: 2,
            filters: [
                {
                    property: 'Parent.Name',
                    operator: '=',
                    value: 'Portfolio Item'
                },
                {
                    property: 'Creatable',
                    operator: '=',
                    value: 'true'
                }
            ],
            autoLoad: true,
            listeners: {
                scope: this,
                load: function(store, types){
                    var selectedType = types[0];
                    
                    var typeNames = [];
                    Ext.each(types, function(value) {
                        typeNames.push(value.get('TypePath'));
                    });
                    
                    Rally.data.ModelFactory.getModels({
                        types : typeNames,
                        context: this.context,
                        success: this._onModelsRetrieved, scope:this
                    });
                    
                    typeComboBox.update(selectedType.getData());
                    typeComboBox.getRecord = function() { return selectedType; };
                    typeComboBox.getValue = function() { return typeNames[0]; };                    
                }
            }
        });
        
        return typeComboBox;
    },

    _getTypeRecordFromComboBox: function() {
        return this.typeComboBox.getRecord();
    },

    _onTypeSelect:function(){
        this.fireEvent('typeChange', this.getSelectedType());
        this._updateTimelineData();
    },

    _updateTimelineData: function() {
        if (this.timeline) {
            this.timeline.hide();
            this.timeline.destroy();
        }
        this._createTimeline();
    },

    _createTimeline: function() {
        //this.timeline = Ext.create('Rally.alm.ui.timeline.Timeline', this._getTimelineConfig());
        this.timeline = Ext.create('DependencyTimeline', this._getTimelineConfig());
        window.tl=this.timeline;
        this.insert(1, this.timeline);
    },

    _buildFilter:function () {
        var filters = [
            {
                property:this.estimatedStartDateField,
                operator:'!=',
                value:'null'
            },
            {
                property:this.estimatedEndDateField,
                operator:'!=',
                value:'null'
            },
            {
                property:this.estimatedEndDateField,
                operator:'>=',
                value:Rally.util.DateTime.format(this.taskStoreConfig.startDate, 'yyyy-MM-dd')
            },
            {
                property:this.estimatedStartDateField,
                operator:'<=',
                value:Rally.util.DateTime.format(this.taskStoreConfig.endDate, 'yyyy-MM-dd')
            },
            this._getTypeFilter()
        ];

        if (this.customQueryString) {
            try {
                filters.push(Rally.data.wsapi.Filter.fromQueryString(this.customQueryString));
            } catch (e) {
                Rally.ui.notify.Notifier.showError({
                    message: e.message
                });
            }
        }

        return filters;
    },

    _buildDrillDownFilter:function () {
        return [{
            property:'Parent',
            operator:'=',
            value:Rally.util.Ref.getRelativeUri(this._expandedNode.get('_ref'))
        }];
    },

    _getCurrentFilter:function () {
        return this._expandedNode ? this._buildDrillDownFilter() : this._buildFilter();
    },

    _getCurrentFetch:function () {
        var fetch = [
            'Name',
            this.estimatedStartDateField,
            this.estimatedEndDateField,
            this.actualStartDateField,
            this.actualEndDateField,
            this.piTypeField,
            this.piTypeOrdinalValueField,
            'Workspace',
            'FormattedID',
            'PercentDoneByStoryCount',
            'PercentDoneByStoryPlanEstimate',
            'LastUpdateDate',
            'Parent',
            'Notes'
        ];


        var record = !this._expandedNode ? this._getTypeRecordFromComboBox() : this._getTypeRecordBelowCurrentlyExpandedNode();
        if(record && record.get(this.piTypeOrdinalValueField) > 0) {
            fetch.push(this.childCountField);
        }

        return fetch;
    },


    _getTypeRecordAtOrdinal: function(ordinal) {
       return this.typeComboBox.findRecord(this.piTypeOrdinalValueField, ordinal);
    },

    _getTaskModelForExpandedType: function() {
        return Rally.alm.ui.timeline.TaskModelFactory.getTaskModel({
            wsapiModel: this._getModelBelowExpandedNode()
        });
    },

    _getModelBelowExpandedNode: function() {
        return this._getModelForTypeRecord(this._getTypeRecordBelowCurrentlyExpandedNode());
    },

    _getModelForTypeRecord: function(record) {
        return this.models[record.get('TypePath')];
    },

    _getModelForCurrentType: function() {
        return this._getModelForTypeRecord(this._getTypeRecordFromComboBox());
    },

    _getTypeRecordBelowCurrentlyExpandedNode : function() {
        return this._getTypeRecordAtOrdinal(this._getCurrentlyExpandedNodeOrdinal() - 1);
    },

    _getCurrentlyExpandedNodeOrdinal: function() {
        return this._expandedNode.get('PortfolioItemType').Ordinal;
    },

    _updateStoreModelWithCurrentlyExpandedType: function(store) {
        this._updateStoreModel(store, this._getTaskModelForExpandedType());
    },

    _onBeforeStoreLoad:function (store, operation) {
        if(operation.node && operation.node.parentNode) {
            this._expandedNode = operation.node;
        }
        
        if(this._expandedNode) {
            this._updateStoreModelWithCurrentlyExpandedType(store);
        }

        operation.filters = this._getCurrentFilter();
        operation.fetch = this._getCurrentFetch();

        //Set context correctly for tree expand
        if (operation.node && operation.node.get('_ref')) {
            operation.context = operation.context || {};
            operation.context.project = null;

            if (this._expandedNode) {
                operation.context.workspace = '/workspace/' + Rally.util.Ref.getOidFromRef(this._expandedNode.get('Workspace')._ref);
            }
        }
    },

    //When the store is initialized with its model, the process of finding the root node decorates
    //the model with additional fields that the tree uses for display. As we move through the tree, the new model needs to be updated
    //with the additional fields (If you don't you get cherkberxes ermahgerd.)
    _updateStoreModel: function(store, model) {
        store.model = model;
        store.setProxy(model.proxy);
        store.getProxy().getReader().buildExtractors(true);
    },

    _onBeforeExpand:function (node) {
        this.fireEvent('beforeexpandnode', this);
    },

    _getTimelineConfig:function () {
        var taskStoreConfig = Ext.apply({
            model:this._getModelForCurrentType(),
            fetch:this._getCurrentFetch(),
            listeners:{
                beforeload:this._onBeforeStoreLoad,
                beforeexpand:this._onBeforeExpand,
                load: this._onTimelineLoaded,
                scope:this
            }
        }, this.taskStoreConfig);

        var projectName = '',
            scopeUp = '',
            scopeDown = '';

        if (this.context) {
            projectName = this.context.projectName;
            scopeUp = this.context.projectScopeUp;
            scopeDown = this.context.projectScopeDown;
        } else {
            var scope = Rally.getScope();
            if(scope.project) {
                projectName = scope.project.Name;
                scopeUp = scope.up;
                scopeDown = scope.down;
            }
        }

        return {
            plugins: [ 
              new Gnt.plugin.Printable({
                mainTpl: Ext.create('Rally.alm.ui.timeline.PrintTimelineTemplate', {
                    projectName: projectName,
                    scopeUp: scopeUp,
                    scopeDown: scopeDown,
                    typeName: this.typeComboBox.rawValue
                })
              })
            ],
            taskStoreConfig: taskStoreConfig,
            leftLabelField: '',
            baselineStartDateField: this.actualStartDateField,
            baselineEndDateField: this.actualEndDateField,
            startDateField : this.estimatedStartDateField,
            endDateField : this.estimatedEndDateField,
            childCountField: this.childCountField,
            columns: this._getColumnConfigs(),
            zoomLevel:this.getZoomLevel(),
            startDate: this.taskStoreConfig.startDate,
            endDate: this.taskStoreConfig.endDate,
            eventRenderer: function(taskRec){
                return {
                    cls: Rally.util.Test.toBrowserTestCssClass('estimated-bar', taskRec.get('ObjectID')),
                    basecls: Rally.util.Test.toBrowserTestCssClass('actual-bar', taskRec.get('ObjectID'))
                };
            },
            viewConfig: {
                loadMask: false
            },
            /**
             * View config for the Gantt Panel, and not the left tree panel
             */
            normalViewConfig: {
                emptyText: this._getEmptyText()
            },
            enableTaskDragDrop: false,
            enableDragCreation: false,
            enableDependencyDragDrop: false,
            resizeHandles: 'none',
            trackHeaderOver: false,
            listeners: {
                scope: this,
                taskclick: function(gantt,taskRecord,e,eOpts) {
                    //
                }
            }
        };
    },

    _getEmptyText: function() {
        var messageTpl = Ext.create('Ext.XTemplate', this.emptyTextTpl);
        var record = this._getTypeRecordFromComboBox();
        var message = messageTpl.apply({selectedType: record.get('Name')});
        var emptyTextMessage = Rally.ui.EmptyTextFactory.getEmptyTextFor(message);

        return emptyTextMessage;
    },

    _onTimelineLoaded: function(taskStore) {
        this.fireEvent('load', this, {});

        if (taskStore.getCount() === 0 && this.timeline.todayLinePlugin) {
            this.timeline.todayLinePlugin.setDisabled(true);
        }

        this._expandedNode = undefined;

        //if (this.getFullScreen()) {
            this._resizeTimelineHeight(this.height);
        //}

        if (Rally.BrowserTest) {
            Rally.BrowserTest.publishComponentReady(this);
        }
    },

    _getRecordFor:function(el, view){
        var row = el.up('tr');
        return view.getRecord(row);
    },

    _getTypeFilter:function () {
        var record = this._getTypeRecordFromComboBox();
        return {
            property:this.piTypeField,
            operator:'=',
            value:Rally.util.Ref.getRelativeUri(record.get('_ref'))
        };
    },

    _getColumnConfigs:function () {
        return [
            {
                xtype:'treecolumn',
                header:"Name",
                dataIndex:'Name',
                width: 200,
                menuDisabled:true,
                renderer:function (value, metaData,record) {
                    return Ext.create('Ext.XTemplate',
                        '{[this.showNotRecentlyUpdated()]}<a href="{[this.createDetailUrl(values)]}" target="_top">{FormattedID}:</a> {Name}',
                        {
                            createDetailUrl:function (values) {
                                return Rally.nav.Manager.getDetailUrl(values);
                            },
                            showNotRecentlyUpdated: function() {
                                var icon = " ";
                                if ( Rally.util.DateTime.getDifference(new Date(), record.get('LastUpdateDate'), 'month') > 3 ) {
                                    icon = "<span class='icon-history'> </span>";
                                }
                                return icon;
                            }
                        }).apply(record.data);
                }
            },
            {
                xtype:'treecolumn',
                header: 'Parent',
                dataIndex: 'Notes', /* using another field because parent has special meaning */
                sortable: true,
                menuDisabled:true,
                renderer: function( value, metaData,record ) {
                    var display_value = "";
                    if ( record.get("_Parent") ){
                        display_value = Ext.create('Ext.XTemplate',
                            '<a href="{[this.createDetailUrl(values)]}" target="_top">{FormattedID}:</a> {Name}',
                            {
                                createDetailUrl:function (values) {
                                    return Rally.nav.Manager.getDetailUrl(values);
                                }
                            }).apply(record.get("_Parent"));
                    }
                    return display_value;
                }
            }
        ];
    },

    getState: function() {
        return { zoomLevel: this.getSelectedZoomLevel().preset };
    },
    
    setWidth:function (w) {
        this.callParent(arguments);
        if (this.timeline) {
            this.timeline.setWidth(w);
        }
    },

    getSelectedZoomLevel:function () {
        return this.timeline.getZoomLevel();
    },

    getDefaultZoomLevel: function(){
        return 'monthAndYear';
    },

    getSelectedType:function () {
        return this.typeComboBox.getValue();
    },

    zoom:function(zoom){
        this.timeline.zoom(zoom);
    },

    getSliderValueFromZoom:function(zoom){
        var sliderValue = this.zoomLevels.indexOf(zoom.preset || zoom);
        //if not found return a reasonable default
        return Math.max(sliderValue,0);
    }
});