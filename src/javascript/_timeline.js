/**
 * The timeline component.
 */
Ext.define('Rally.alm.ui.timeline.Timeline', {
    alias:"widget.almtimeline",
    extend: 'Gnt.panel.Gantt',
    
    requires: [
        'Sch.util.Date',
        'Sch.preset.Manager',
        'Rally.ui.renderer.RendererFactory',
        'Rally.alm.ui.timeline.TaskModelFactory',
        'Gnt.plugin.Printable'
    ],

    bubbleEvents:['add','remove','zoom','taskclick','dependencydblclick'],

    statics:{
        errorMessages:{
            missingTreeColumn:  "Timeline component requires that at least one column in the config is of xtype treecolumn",
            columnMustBeAnArray:  "Timeline component requires columns to be sent into the config as an array"
        }
    },

    clientMetrics: {
        beginEvent: 'added',
        endEvent: 'load',
        description: 'timeline loaded'
    },

    itemId: 'rallyTimeline',
    height: 350,
    width: '100%',
    highlightWeekends: false,
    loadMask: true,
    config: {
        /**
         * @cfg {String} viewPreset A key used to lookup a predefined Sch.preset.ViewPreset (e.g. 'weekAndDay', 'hourAndDay'), managed by Sch.preset.Manager. See Sch.preset.Manager for more information.
         * Do not use this, use zoomLevel instead.
         */

        /**
         * @cfg {String} leftLabelField The field that will be displayed to the left of each bar can be deleted to have the component show no fields.
         * This field will be used to find the renderer off of the model if possible to render the field properly.
         */
        leftLabelField:"_refObjectName",

        /**
         * @cfg {String} rightLabelField The field that will be displayed to the right of each bar. Can be deleted to have the component show nothing.
         * This field will be used to find the renderer off of the model if possible to render the field properly.
         */

        /**
         * @cfg {String}
         * The date field that will be used for the left border of the item's time representation.
         */
        startDate: Sch.util.Date.add(new Date(), Sch.util.Date.MONTH, -3),

        /**
         * @cfg {String}
         * The date field that will be used for the right border of the item's time representation.
         */
        endDate: Sch.util.Date.add(new Date(), Sch.util.Date.YEAR, 1),

        /**
         * @cfg {Boolean} showTodayLine
         * Controls whether or not a vertical line is shown at today's date
         */
        showTodayLine: true,

        /**
         * @cfg {String} startDateField
         * The date field to determine the start of the task bar
         */

        /**
         * @cfg {String} endDateField
         * The date field to determine the end of the task bar
         */

        /**
         * @cfg {Number} baselinePercentDoneField
         * The date field to determine the percent done for the task bar
         */

        /**
         * @cfg {String} baselineStartDateField
         * The date field to determine the start of the baseline bar
         */

        /**
         * @cfg {String} baselineEndDateField
         * The date field to determine the end of the baseline bar
         */

        /**
         * @cfg {Number} percentDoneField
         * The field that will be used for the percent done portion of the item's time representation.
         */

        /**
         * @cfg {Boolean} toggleParentTasksOnClick
         * Whether or not clicking on timeline bars causes a hierarchcy expand/collapse
         */
        toggleParentTasksOnClick: false,

        /**
         * @cfg {String} childCountField
         * The field from which to determine whether an item has children
         */
        childCountField: 'Children',

        /**
         * @cfg {Number/String}
         * The default zoom level.  Either a string or an index into the Rally.alm.ui.timeline.Timeline#zoomLevels array.
         */
        zoomLevel: 'rallyWeekAndMonth',

        /**
         * @cfg {Object[]}
         * The zoom levels that are supported by Rally.alm.ui.timeline.Timeline#zoom.
         * See Sch.preset.Manager for valid values.
         */
        zoomLevels: [
            { width: 30,    increment: 1,   resolution: 1, preset: 'year', resolutionUnit: 'MONTH' },
            { width: 100,   increment: 1,   resolution: 7, preset: 'monthAndYear', resolutionUnit: 'DAY'},
            { width: 50,    increment: 1,   resolution: 1, preset: 'rallyWeekAndMonth', resolutionUnit: 'DAY'}
        ]
    },

    plugins: new Gnt.plugin.Printable(),

    constructor: function(config) {
        this.initConfig(config);

        //adjust end date for using ie to add an additional week for layout
        this._adjustEndDateForIERendering();

        this._createRallyDefaultViewPreset();

        if (!config.columns) {
            config.columns = this.getDefaultColumns(config.taskStoreConfig.model);
        }

        this.zoomLevel = this._resolveZoomLevel(this.zoomLevel);

        config.viewPreset = this.zoomLevel.preset;

        var taskStoreConfig = Ext.apply({
            autoLoad: true,
            sorters: [
                {
                    property: 'Parent',
                    direction: 'DESC'
                },
                {
                    property: 'PlannedStartDate',
                    direction: 'DESC'
                },
                {
                    property: 'PlannedEndDate',
                    direction: 'DESC'
                },
                {
                    property:'Rank',
                    direction: 'ASC'
                }
            ],
            listeners: {
                load: this._onLoaded,
                scope: this
            },
            recalculateParents: false
        }, config.taskStoreConfig);
        
        taskStoreConfig.model = Rally.alm.ui.timeline.TaskModelFactory.getTaskModel({
            wsapiModel: taskStoreConfig.model
        });
        
        var taskStore = Ext.create("Gnt.data.TaskStore", taskStoreConfig);
        taskStore.on('load', this._onLoaded, this);

        config.taskStore = taskStore;

        this._validateColumns(config.columns);

        if (config.leftLabelField) {
            config.leftLabelField = this._generateLabelFieldConfig(this.config.leftLabelField, config.taskStore.model);
        }
        if (config.rightLabelField) {
            config.rightLabelField = this._generateLabelFieldConfig(this.config.rightLabelField, config.taskStore.model);
        }

        if (config.baselineStartDateField && config.baselineEndDateField) {
            config.enableBaseline =  true;
            config.baselineVisible = true;
        }

        this.callParent(arguments);
    },

    _resolveZoomLevel: function(zoomLevel) {
        var resolvedZoomLevel;

        if(_.isObject(zoomLevel)) {
            resolvedZoomLevel = zoomLevel;
        }

        if(_.isNumber(zoomLevel)) {
            resolvedZoomLevel = this.zoomLevels[zoomLevel];
        }

        if(_.isString(zoomLevel)) {
            resolvedZoomLevel = _.find(this.zoomLevels, { preset: zoomLevel });

        }

        return resolvedZoomLevel || this.zoomLevels[2];
    },

    _adjustEndDateForIERendering: function() {
        //IE hack to handle crap display when 1st of the month is on or after Thursday not past the first Sunday of the month
        var endDateCalendarDay = this.endDate.getDate();
        var endDateDayOfWeek = this.endDate.getDay();
        if (endDateCalendarDay <= 4 && (endDateDayOfWeek < 2 || endDateDayOfWeek > 4)) {
            var addWeek = false;
            switch (endDateDayOfWeek) {
                case 5: //Friday
                    addWeek = (endDateCalendarDay < 2);
                    break;
                case 6: //Saturday
                    addWeek = (endDateCalendarDay < 3);
                    break;
                case 0: //Sunday
                    addWeek = (endDateCalendarDay < 4);
                    break;
                case 1: //Monday
                    addWeek = (endDateCalendarDay !== 1);
                    break;
            }
            if (addWeek) {
                this.endDate = Sch.util.Date.add(this.endDate, Sch.util.Date.DAY, 7);
            }
        }
    },

    initComponent: function() {
        this.callParent(arguments);

        this.addEvents([
           /**
            * @event
            * Fires when a zoom has completed
            * @param {Rally.alm.ui.timeline.Timeline} this
            * @param {Number} zoomLevel The new zoom level
            */
            'zoom',
            /**
             * @event
             * Fires after the timeline has loaded
             * @param {Rally.alm.ui.timeline.Timeline} this
             */
            'afterload'
        ]);
    },

    /**
     * Set the Timeline's zoom level
     * @param {Number/String} zoomLevel A number between 0 and length of Rally.alm.ui.timeline.Timeline#zoomLevels - 1.
     * This number will be used to index the Rally.alm.ui.timeline.Timeline#zoomLevels array.
     * Alternatively, you can pass in a string element in the Rally.alm.ui.timeline.Timeline#zoomLevels array.
     */
    zoom: function(zoomLevel){
        zoomLevel = this._resolveZoomLevel(zoomLevel);
        this.switchViewPreset(zoomLevel.preset, this.startDate, this.endDate);
        if(this.getStore().getCount() > 0){
            this._scrollNearToday();
        }
        this.zoomLevel = zoomLevel;
        this.fireEvent('zoom', zoomLevel);
    },

    _onLoaded: function(taskStore, model, records) {
        Ext.Array.each(records,function(record){
            // put the parent back for columns
            record.set("_Parent",record.raw.Parent);
            // put the parent id in for sorting
            if ( record.raw.Parent ){
                record.set("Notes", record.raw.Parent.FormattedID);
            } else { 
                record.set("Notes", "-");
            }
        });
        taskStore.sort(
            { property: 'Notes', direction: 'ASC' },
            {
                property: 'PlannedStartDate',
                direction: 'DESC'
            },
            {
                property: 'PlannedEndDate',
                direction: 'DESC'
            },
            {
                property:'Rank',
                direction: 'ASC'
            }
        );
        
        if (this.isVisible()) {
            this._ieFixHeaderWidthComputeIssue();

            this.suspendEvents();
            this.zoom(this.zoomLevel);
            this.resumeEvents();

            if(records.length < 1){
                //empty message is to the left, scroll there if we don't have any records
                this.getSchedulingView().getEl().scrollTo('left', 0);
            }

            //slim down the space between the tree and the timeline
            this.down('bordersplitter').setWidth(2);

            if(records.length >= 1) {
                this._scrollNearToday();
            }

            this.fireEvent('afterload');
        }
    },

    _scrollNearToday: function(){
        this.scrollToDate(Rally.util.DateTime.add(new Date(), 'day', -14));
    },

    _getViewportLeftDate: function() {
         var schedulingView = this.getSchedulingView();
         var scroll = schedulingView.getEl().getScroll();

         var xCoordinate = [scroll.left, 0];
         return schedulingView.getDateFromXY(xCoordinate, null, true);
     },

    show: function() {
        this._ieFixHeaderWidthComputeIssue();
        this.callParent(arguments);
    },

    _ieFixHeaderWidthComputeIssue: function() {
        if (Ext.isIE) {
            var svTimeaxisHdr = this.getEl().down('.sch-timeaxiscolumn');
            if (svTimeaxisHdr) {
                var svHdr = svTimeaxisHdr.up('div');
                if (svHdr) {
                    var svHdrWidth = svHdr.dom.style.width;
                    if (svHdrWidth) {
                        if (svTimeaxisHdr.dom.style.width && svTimeaxisHdr.dom.style.width !== svHdrWidth) {
                            svTimeaxisHdr.dom.style.width = svHdrWidth;
                        }
                        var hdrTable = svHdr.down('table');
                        if (hdrTable.dom.style.width && hdrTable.dom.style.width !== svHdrWidth) {
                            hdrTable.dom.style.width = svHdrWidth;
                        }
                    }
                }
            }
        }
    },

    // Setup your static columns
    /**
     * @return {Object} Returns the set of default columns for a timeline
     */
    getDefaultColumns: function(model) {
        var nameField = model.getField("Name");
        if (nameField) {
            return [
                {
                    xtype : 'treecolumn',
                    header:"Name",
                    dataIndex: 'Name',
                    width: 200,
                    menuDisabled: true
                }
            ];
        }
        else {
            return [
                {
                    xtype : 'treecolumn',
                    header:"Name",
                    dataIndex: '_refObjectName',
                    width: 200
                }
            ];
        }
    },

    //checks to make sure that a tree column is specified.
    _validateColumns:function(columns) {
        if (!Ext.isArray(columns)) {
            throw this.self.errorMessages.columnMustBeAnArray;
        }
        var types = Ext.Array.pluck(columns, "xtype");
        if (Ext.Array.indexOf(types, "treecolumn") == -1) {
            throw this.self.errorMessages.missingTreeColumn;
        }
    },

    _generateLabelFieldConfig:function(labelField, model) {
        if (Ext.isString(labelField)) {
            return {
                dataIndex:labelField,
                renderer:function(value, record) {
                    var template = Rally.ui.renderer.RendererFactory.getRenderTemplate(model.getField(labelField));
                    return template.apply(record.data);
                }
            };
        }
        return labelField;
    },

    _createRallyDefaultViewPreset: function() {
        var curContext = Rally.environment.getContext();
        var userDateFormat = curContext.getUser().UserProfile.DateFormat ||
                curContext.getWorkspace().WorkspaceConfiguration.DateFormat;

        var config = {
            timeColumnWidth : 100,
            rowHeight: 24,          // Only used in horizontal orientation
            resourceColumnWidth : 100,  // Only used in vertical orientation
            displayDateFormat : 'Y-m-d',
            shiftUnit : "WEEK",
            shiftIncrement : 5,
            defaultSpan : 6,       // By default, show 6 weeks
            timeResolution : {
                unit : "DAY",
                increment : 1
            },
            headerConfig : {
                middle : {
                    unit : "WEEK",
                    renderer : function(start, end, cfg) {
                        return Rally.util.DateTime.format(start, userDateFormat);
                    }
                },
                top : {
                    unit : "MONTH",
                    dateFormat : 'M Y'
                }
            }
        };
        Sch.preset.Manager.registerPreset('rallyWeekAndMonth', config);
    }
});