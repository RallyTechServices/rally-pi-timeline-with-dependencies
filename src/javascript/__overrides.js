/**
 * Overrides Gnt.template.Task in gnt-fix.js to replace the 'actual' line renderer with a custom percent done renderer.
 */
Ext.define("Rally.alm.ui.timeline.PercentDoneTaskTemplate", {
    extend : 'Ext.XTemplate',
    requires: [
        'Rally.util.HealthColorCalculator'
    ],

    constructor: function(cfg) {

        cfg.leftLabel = 'test';

        this.callParent([
                '<div class="sch-event-wrap {ctcls} x-unselectable" style="left:{offset}px;">' +
                // Left label
                    '<div class="sch-gantt-labelct sch-gantt-labelct-left"><label class="sch-gantt-label sch-gantt-label-left">{[this.getPercentDoneValue(values)]}%</label></div>' +

                // Task bar
                    '<div id="' + cfg.prefix + '{id}" class="sch-gantt-item sch-gantt-task-bar {internalcls} {cls}" unselectable="on" style="background-color:{[this.getPercentDoneColor(values)]} !important;width:{width}px;{style}">'+
                // Left terminal
                    (cfg.enableDependencyDragDrop ? '<div unselectable="on" class="sch-gantt-terminal sch-gantt-terminal-start"></div>' : '') +
                    ((cfg.resizeHandles === 'both' || cfg.resizeHandles === 'left') ? '<div class="sch-resizable-handle sch-gantt-task-handle sch-resizable-handle-west"></div>' : '') +

                    '<div class="sch-gantt-progress-bar" style="width:{percentDone}%;{progressBarStyle}" unselectable="on">&#160;</div>' +

                    ((cfg.resizeHandles === 'both' || cfg.resizeHandles === 'right') ? '<div class="sch-resizable-handle sch-gantt-task-handle sch-resizable-handle-east"></div>' : '') +
                // Right terminal
                    (cfg.enableDependencyDragDrop ? '<div unselectable="on" class="sch-gantt-terminal sch-gantt-terminal-end"></div>' : '') +
                    (cfg.enableProgressBarResize ? '<div style="left:{percentDone}%" class="sch-gantt-progressbar-handle"></div>': '') +
                    '</div>' +

                // Right label
                    (cfg.rightLabel ? '<div class="sch-gantt-labelct sch-gantt-labelct-right" style="left:{width}px"><label class="sch-gantt-label sch-gantt-label-right">{rightLabel}</label></div>' : '') +
                '</div>',
            {
                compiled: true,
                disableFormats: true,
                getPercentDoneValue: function(options) {
                    var record = options.taskModel;
                    return Math.round(record.get('PercentDoneByStoryCount') * 100);
                },
                getPercentDoneColor: function(options){
                    var record = options.taskModel;
                    var colorObject = Rally.util.HealthColorCalculator.calculateHealthColorForPortfolioItemData(record.data, 'PercentDoneByStoryCount');
                    return colorObject.hex;
                }
            }
        ]);
    }

});

/**
 * Overrides Gnt.template.ParentTask in gnt-fix.js to replace the 'actual' line renderer with a custom percent done renderer.
 */
Ext.define("Rally.alm.ui.timeline.PercentDoneParentTaskTemplate", {
    extend : 'Ext.XTemplate',
    requires: [
        'Rally.util.HealthColorCalculator'
    ],

    constructor: function(cfg) {

        this.callParent([
                '<div class="sch-event-wrap {ctcls} x-unselectable" style="left:{offset}px;width:{width}px">'+
                // Left label
                    '<div class="sch-gantt-labelct sch-gantt-labelct-left"><label class="sch-gantt-label sch-gantt-label-left">{[this.getPercentDoneValue(values)]}%</label></div>'+

                // Task bar
                    '<div id="' + cfg.prefix + '{id}" class="sch-gantt-item sch-gantt-parenttask-bar {internalcls} {cls}" style="background-color:{[this.getPercentDoneColor(values)]} !important;{style}">'+
                // Left terminal

                    '<div class="sch-gantt-progress-bar" style="width:{percentDone}%;{progressBarStyle}">&#160;</div>'+
                    (cfg.enableDependencyDragDrop ? '<div class="sch-gantt-terminal sch-gantt-terminal-start"></div>' : '') +

                    '<div class="sch-gantt-parenttask-arrow sch-gantt-parenttask-leftarrow"></div>'+
                    '<div class="sch-gantt-parenttask-arrow sch-gantt-parenttask-rightarrow"></div>'+
                // Right terminal
                    (cfg.enableDependencyDragDrop ? '<div class="sch-gantt-terminal sch-gantt-terminal-end"></div>' : '') +
                    '</div>'+

                // Right label
                    (cfg.rightLabel ? '<div class="sch-gantt-labelct sch-gantt-labelct-right" style="left:{width}px"><label class="sch-gantt-label sch-gantt-label-right">{rightLabel}</label></div>' : '') +
                '</div>',
            {
                compiled: true,
                disableFormats: true,
                getPercentDoneValue: function(options) {
                    var record = options.taskModel;
                    return Math.round(record.get('PercentDoneByStoryCount') * 100);
                },
                getPercentDoneColor: function(options){
                    var record = options.taskModel;
                    var colorObject = Rally.util.HealthColorCalculator.calculateHealthColorForPortfolioItemData(record.data, 'PercentDoneByStoryCount');
                    return colorObject.hex;
                }
            }
        ]);
    }

});


//workaround for treestore used by timeline component not passing store params to proxy correctly
//(context, fetch, filters) and bug with deleting data on store load
Ext.override(Ext.data.TreeStore, {
    load: function(options) {
        options = options || {};
        options.params = options.params || {};

        var me = this,
            node = options.node || me.tree.getRootNode(),
            callback = options.callback,
            scope = options.scope,
            operation;

        //pass along additional params
        options.fetch = options.fetch || this.fetch;
        options.context = options.context || this.context;

        // If there is not a node it means the user hasnt defined a rootnode yet. In this case let's just
        // create one for them.
        if (!node) {
            node = me.setRootNode({
                expanded: true
            }, true);
        }

        // If the node we are loading was expanded, we have to expand it after the load
        if (node.data.expanded) {
            node.data.loaded = false;

            // Must set expanded to false otherwise the onProxyLoad->fillNode->appendChild calls will update the view.
            // We ned to update the view in the callback below.
            if (me.clearOnLoad) {
                node.data.expanded = false;
            }
            options.callback = function() {

                // If newly loaded nodes are to be added to the existing child node set, then we have to collapse
                // first so that they get removed from the NodeStore, and the subsequent expand will reveal the
                // newly augmented child node set.
                if (!me.clearOnLoad) {
                    node.collapse();
                }
                node.expand();

                // Call the original callback (if any)
                Ext.callback(callback, scope, arguments);
            };
        }

        // Assign the ID of the Operation so that a ServerProxy can set its idParam parameter,
        // or a REST proxy can create the correct URL
        options.id = node.getId();

        options = Ext.apply({
            action: 'read',
            filters: me.filters.items,
            sorters: me.getSorters(),
            node: options.node || node
        }, options);

        me.lastOptions = options;

        operation = new Ext.data.Operation(options);

        if (me.fireEvent('beforeload', me, operation) !== false) {
            if (me.clearOnLoad) {
                if(me.clearRemovedOnLoad) {
                    // clear from the removed array any nodes that were descendants of the node being reloaded so that they do not get saved on next sync.
                    me.clearRemoved(node);
                }
                // temporarily remove the onNodeRemove event listener so that when removeAll is called, the removed nodes do not get added to the removed array
                me.tree.un('remove', me.onNodeRemove, me);
                // remove all the nodes
                node.removeAll(false);
                // reattach the onNodeRemove listener
                me.tree.on('remove', me.onNodeRemove, me);
            }
            me.loading = true;
            me.proxy.read(operation, me.onProxyLoad, me);
        }

        if (me.loading && node) {
            node.set('loading', true);
        }

        return me;
    }
});

//workaround for Gantt behavior that causes tooltip end date to be one day too early
Ext.override(Gnt.view.Gantt, {
    getFormattedEndDate: function(endDate, startDate) {
        return Ext.Date.format(endDate, this.getDisplayDateFormat());
    }
});

Ext.override(Gnt.view.Gantt, {
/**
 * Overridden to use a custom template for the actual bar (baseline task and baseline parent task templates, in gantt language).
 * Look for FIX: for spots that you need to pay attention to
 */
    setupTemplates: function(){
        this.callParent(arguments);
    
        var tplCfg = {
            prefix : this.eventPrefix
        };
    
        // FIX: create baseline templates for actual values (2.1.15 reuses eventTemplate...)
        this.baselineTaskTemplate = Ext.create("Rally.alm.ui.timeline.PercentDoneTaskTemplate", tplCfg);
        this.baselineParentTaskTemplate = Ext.create("Rally.alm.ui.timeline.PercentDoneParentTaskTemplate", tplCfg);
    },
     /**
     * Overridden to pass in the taskModel into the baseTpl call, so we can have access to the actual PI record
     * when we're rendering the actual bar (Rally.alm.ui.timeline.PercentDoneTaskTemplate).
     */

    columnRenderer: function (value, meta, taskModel) {
        var taskStart = taskModel.getStartDate(),
            ta = this.timeAxis,
            D = Sch.util.Date,
            tplData = {},
            cellResult = '',
            ctcls = '',
            viewStart = ta.getStart(),
            viewEnd = ta.getEnd(),
            isMilestone = taskModel.isMilestone(),
            isLeaf = taskModel.isLeaf(),
            userData, startsInsideView, endsOutsideView;

        if (taskStart) {
            var taskEnd = taskModel.getEndDate() || Sch.util.Date.add(taskStart, Sch.util.Date.DAY, 1),
                doRender = Sch.util.Date.intersectSpans(taskStart, taskEnd, viewStart, viewEnd);

            if (doRender) {
                endsOutsideView = taskEnd > viewEnd;
                startsInsideView = D.betweenLesser(taskStart, viewStart, viewEnd);

                var taskStartX = Math.floor(this.getXFromDate(startsInsideView ? taskStart : viewStart)),
                    taskEndX = Math.floor(this.getXFromDate(endsOutsideView ? viewEnd : taskEnd)),
                    itemWidth = isMilestone ? 0 : taskEndX - taskStartX,
                    lField = this.leftLabelField,
                    rField = this.rightLabelField,
                    tField = this.topLabelField,
                    bField = this.bottomLabelField,
                    tpl = this.getTemplateForTask(taskModel);

                if (!isMilestone && !isLeaf) {
                    if (endsOutsideView) {
                        itemWidth += this.parentTaskOffset; // Compensate for the parent arrow offset (6px on left side)
                    } else {
                        itemWidth += 2 * this.parentTaskOffset; // Compensate for the parent arrow offset (6px on both sides)
                    }
                }

                tplData = {
                    // Core properties
                    id          : taskModel.internalId,
                    offset      : isMilestone ? (taskEndX || taskStartX) - this.getXOffset(taskModel) : taskStartX,
                    width       : Math.max(1, itemWidth),
                    ctcls       : '',
                    cls         : '',
                    print       : this._print,
                    record      : taskModel,
                    // Percent complete
                    percentDone : Math.min(taskModel.getPercentDone() || 0, 100)
                };

                // Get data from user "renderer"
                userData = this.eventRenderer.call(this.eventRendererScope || this, taskModel, tplData, taskModel.store) || {};

                if (lField) {
                    // Labels
                    tplData.leftLabel = lField.renderer.call(lField.scope || this, taskModel.data[lField.dataIndex], taskModel);
                }

                if (rField) {
                    tplData.rightLabel = rField.renderer.call(rField.scope || this, taskModel.data[rField.dataIndex], taskModel);
                }

                if (tField) {
                    tplData.topLabel = tField.renderer.call(tField.scope || this, taskModel.data[tField.dataIndex], taskModel);
                }

                if (bField) {
                    tplData.bottomLabel = bField.renderer.call(bField.scope || this, taskModel.data[bField.dataIndex], taskModel);
                }

                Ext.apply(tplData, userData);

                var dataCls = ' sch-event-resizable-' + taskModel.getResizable();

                if (isMilestone) {
                    tplData.side = Math.round((this.enableBaseline ? 0.4 : 0.5) * this.rowHeight);
                    ctcls += " sch-gantt-milestone";
                } else {
                    tplData.width = Math.max(1, itemWidth);

                    if (endsOutsideView) {
                        ctcls += ' sch-event-endsoutside ';
                    }

                    if (!startsInsideView) {
                        ctcls += ' sch-event-startsoutside ';
                    }

                    if (isLeaf) {
                        ctcls += " sch-gantt-task";
                    } else {
                        ctcls += " sch-gantt-parent-task";
                    }
                }

                if (taskModel.dirty) {
                    dataCls += ' sch-dirty ';
                }

                if (taskModel.isDraggable() === false) {
                    dataCls += ' sch-event-fixed ';
                }

                tplData.cls = (tplData.cls || '') + (taskModel.getCls() || '') + dataCls;
                tplData.ctcls += ' ' + ctcls;

                cellResult += tpl.apply(tplData);
            }
        }

        if (this.enableBaseline) {

            var taskBaselineStart           = taskModel.getBaselineStartDate(),
                taskBaselineEnd             = taskModel.getBaselineEndDate();

            if (!userData) {
                userData                    = this.eventRenderer.call(this, taskModel, tplData, taskModel.store) || {};
            }

            if (taskBaselineStart && taskBaselineEnd && Sch.util.Date.intersectSpans(taskBaselineStart, taskBaselineEnd, viewStart, viewEnd)) {
                endsOutsideView             = taskBaselineEnd > viewEnd;
                startsInsideView            = D.betweenLesser(taskBaselineStart, viewStart, viewEnd);

                var isBaselineMilestone     = taskModel.isBaselineMilestone(),
                    baseStartX              = Math.floor(this.getXFromDate(startsInsideView ? taskBaselineStart : viewStart)),
                    baseEndX                = Math.floor(this.getXFromDate(endsOutsideView ? viewEnd : taskBaselineEnd)),
                    baseWidth               = isBaselineMilestone ? 0 : baseEndX - baseStartX,
                    baseTpl                 = this.getTemplateForTask(taskModel, true),
                    data                    = {
                        progressBarStyle : userData.baseProgressBarStyle || '',
                        id               : taskModel.internalId + '-base',
                        percentDone      : taskModel.getBaselinePercentDone(),
                        offset           : isBaselineMilestone ? (baseEndX || baseStartX) - this.getXOffset(taskModel, true) : baseStartX,
                        print            : this._print,
                        width            : Math.max(1, baseWidth),
                        baseline         : true,
                        taskModel        : taskModel // FIX pass the taskModel in
                    };

                // FIX use our templates instead of event templates
                if(taskModel.isLeaf()) {
                    baseTpl = this.baselineTaskTemplate;
                } else if (!isBaselineMilestone) {
                    baseTpl = this.baselineParentTaskTemplate;
                }

                ctcls                       = '';

                if (isBaselineMilestone) {
                    data.side               = Math.round(0.40 * this.rowHeight);
                    ctcls                   = "sch-gantt-milestone-baseline sch-gantt-baseline-item";
                } else if (taskModel.isLeaf()) {
                    ctcls                   = "sch-gantt-task-baseline sch-gantt-baseline-item";
                } else {
                    ctcls                   = "sch-gantt-parenttask-baseline sch-gantt-baseline-item";
                }

                if (endsOutsideView) {
                    ctcls                   += ' sch-event-endsoutside ';
                }

                if (!startsInsideView) {
                    ctcls                   += ' sch-event-startsoutside ';
                }

                // HACK, a bit inconsistent. 'basecls' should probably end up on the task el instead of the wrapper.
                data.ctcls                  = ctcls + ' ' + (userData.basecls || '');

                cellResult                  += baseTpl.apply(data);
            }
        }

        return cellResult;
    }
});

// Add more fields for the PIs we pull
Ext.override(Rally.alm.ui.timeline.TaskModelFactory,{
    wsapiFieldsToInclude: {
            portfolioitem: [
                'PortfolioItemType',
                'FormattedID',
                'PercentDoneByStoryCount',
                'PercentDoneByStoryPlanEstimate',
                'ActualStartDate',
                'ActualEndDate',
                'Project',
                'Workspace',
                'PlannedStartDate',
                'PlannedEndDate',
                'AcceptedLeafStoryCount',
                'AcceptedLeafStoryPlanEstimateTotal',
                'UnEstimatedLeafStoryCount',
                'LeafStoryPlanEstimateTotal',
                'DirectChildrenCount',
                'LeafStoryCount',
                'LastUpdateDate'
            ]
        }
});
