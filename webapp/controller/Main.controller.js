sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
    'sap/ui/model/Sorter',
    "sap/ui/Device",
    "sap/ui/table/library",
    "sap/m/TablePersoController",
    'sap/m/MessageToast',
	'sap/m/SearchField'
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
     function (BaseController, JSONModel, MessageBox, Filter, FilterOperator, Sorter, Device, library, TablePersoController, MessageToast, SearchField) {
        "use strict";

        var _this;
        var _oCaption = {};
        var _aSmartFilter;
        var _sSmartFilterGlobal;
        var _startUpInfo = {};
        var _aTableProp = [];

        return BaseController.extend("zuiprdconsump.controller.Main", {
            onInit: function () {
                _this = this;

                _this.getCaption();

                var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_PRDCONS_FILTER_CDS");
                var oSmartFilter = this.getView().byId("sfbPrdCons");
                oSmartFilter.setModel(oModel);
                //oSmartFilter.addStyleClass("hide");

                this.initializeComponent();
            },

            initializeComponent() {
                this.getView().setModel(new JSONModel({
                    sbu: "VER",
                    rowCountIO: 0,
                    rowCountStock: 0,
                    rowCountMatDoc: 0
                }), "ui");

                this.onInitBase(_this, _this.getView().getModel("ui").getData().sbu);

                _this.showLoadingDialog("Loading...");

                _aTableProp.push({
                    modCode: "PRDCONSUMPIOMOD",
                    tblSrc: "ZDV_PRDCON_IO",
                    tblId: "ioTab",
                    tblModel: "io"
                });

                _aTableProp.push({
                    modCode: "PRDCONSUMPSTOCKMOD",
                    tblSrc: "ZDV_PRDCON_STOCK",
                    tblId: "stockTab",
                    tblModel: "stock"
                });

                _aTableProp.push({
                    modCode: "PRDCONSUMPMATDOCMOD",
                    tblSrc: "ZDV_PRDCON_MTDOC",
                    tblId: "matDocTab",
                    tblModel: "matDoc"
                });

                _this.getColumns(_aTableProp);

                this.getView().setModel(new JSONModel({ results: []}), "io");
                this.getView().setModel(new JSONModel({ results: []}), "stock");
                this.getView().setModel(new JSONModel({ results: []}), "matDoc");

                // IO
                this.byId("btnRefreshIO").setEnabled(false);
                this.byId("btnFullScreenIO").setEnabled(false);
                this.byId("btnTabLayoutIO").setEnabled(false);

                // Stock
                this.byId("btnPostConsumpStock").setEnabled(false);
                this.byId("btnRefreshStock").setEnabled(false);
                this.byId("btnFullScreenStock").setEnabled(false);
                this.byId("btnTabLayoutStock").setEnabled(false);

                // MatDoc
                this.byId("btnCancelConsumpMatDoc").setEnabled(false);
                this.byId("btnDispDtlMatDoc").setEnabled(false);
                this.byId("btnRefreshMatDoc").setEnabled(false);
                this.byId("btnFullScreenMatDoc").setEnabled(false);
                this.byId("btnTabLayoutMatDoc").setEnabled(false);


                if (sap.ushell.Container) {
                    var oModelStartUp= new sap.ui.model.json.JSONModel();
                    oModelStartUp.loadData("/sap/bc/ui2/start_up").then(() => {
                        _startUpInfo = oModelStartUp.oData;
                    });
                }
                else {
                    _startUpInfo.id = "BAS_CONN";
                }

                this._tableRendered = "";
                var oTableEventDelegate = {
                    onkeyup: function(oEvent){
                        _this.onKeyUp(oEvent);
                    },

                    onAfterRendering: function(oEvent) {
                        _this.onAfterTableRendering(oEvent);
                    },

                    onclick: function(oEvent) {
                        _this.onTableClick(oEvent);
                    }
                };

                this.byId("ioTab").addEventDelegate(oTableEventDelegate);
                this.byId("stockTab").addEventDelegate(oTableEventDelegate);
                this.byId("matDocTab").addEventDelegate(oTableEventDelegate);

                this._sActiveTable = "ioTab";
                this.closeLoadingDialog();
            },

            onAfterTableRender(pTableId, pTableProps) {
                //console.log("onAfterTableRendering", pTableId)
            },

            onSearchIO(oEvent) {
                var oSmartFilter = _this.getView().byId("sfbPrdCons");
                oSmartFilter.showFilterDialog();
            },

            onSearch(oEvent) {
                this.showLoadingDialog("Loading...");

                var aSmartFilter = this.getView().byId("sfbPrdCons").getFilters();
                // var sFilterGlobal = "";
                // if (oEvent) sFilterGlobal = oEvent.getSource()._oBasicSearchField.mProperties.value;
                
                _aSmartFilter = aSmartFilter;
                // _sFilterGlobal = sFilterGlobal;
                this.getIO(aSmartFilter);

                // IO
                this.byId("btnRefreshIO").setEnabled(true);
                this.byId("btnFullScreenIO").setEnabled(true);
                this.byId("btnTabLayoutIO").setEnabled(true);

                // Stock
                this.byId("btnPostConsumpStock").setEnabled(true);
                this.byId("btnRefreshStock").setEnabled(true);
                this.byId("btnFullScreenStock").setEnabled(true);
                this.byId("btnTabLayoutStock").setEnabled(true);

                // MatDoc
                this.byId("btnCancelConsumpMatDoc").setEnabled(true);
                this.byId("btnDispDtlMatDoc").setEnabled(true);
                this.byId("btnRefreshMatDoc").setEnabled(true);
                this.byId("btnFullScreenMatDoc").setEnabled(true);
                this.byId("btnTabLayoutMatDoc").setEnabled(true);
            },

            getIO(pFilters) {
                //_this.showLoadingDialog("Loading...");
                var oSmartFilter = this.getView().byId("sfbPrdCons").getFilters();
                var aFilters = [],
                    aFilter = [],
                    aCustomFilter = [],
                    aSmartFilter = [];

                if (oSmartFilter.length > 0) {
                    if (oSmartFilter[0].aFilters)  {
                        oSmartFilter[0].aFilters.forEach(item => {
                            if (item.aFilters === undefined) {
                                aFilter.push(new Filter(item.sPath, item.sOperator, item.oValue1));
                            }
                            else {
                                aFilters.push(item);
                            }
                        })
    
                        if (aFilter.length > 0) { aFilters.push(new Filter(aFilter, false)); }
                    }
                    else {
                        var sName = pFilters[0].sPath;
                        aFilters.push(new Filter(sName, FilterOperator.EQ, pFilters[0].oValue1));
                    }
                }
                aSmartFilter.push(new Filter(aFilters, true));

                var oModel = this.getOwnerComponent().getModel();

                // var sPlantCd = "";
                // var sIONo = "";
                // var sProcessCd = "";
                // var sStyleCd = "";
                // var sSeasonCd = "";

                // if (pFilters.length > 0 && pFilters[0].aFilters) {
                //     pFilters[0].aFilters.forEach(x => {
                //         if (Object.keys(x).includes("aFilters")) {
                //             x.aFilters.forEach(y => {
                //                 if (y.sPath.toUpperCase() == "PLANTCD") sPlantCd = y.oValue1;
                //                 else if (y.sPath.toUpperCase() == "IONO") sIONo = y.oValue1;
                //                 else if (y.sPath.toUpperCase() == "PROCESSCD") sProcessCd = y.oValue1;
                //                 else if (y.sPath.toUpperCase() == "STYLECD") sStyleCd = y.oValue1;
                //                 else if (y.sPath.toUpperCase() == "SEASONCD") sSeasonCd = y.oValue1;
                //             });
                //         } else {
                //             if (x.sPath.toUpperCase() == "PLANTCD") sPlantCd = x.oValue1;
                //             else if (x.sPath.toUpperCase() == "IONO") sIONo = x.oValue1;
                //             else if (x.sPath.toUpperCase() == "PROCESSCD") sProcessCd = x.oValue1;
                //             else if (x.sPath.toUpperCase() == "STYLECD") sStyleCd = x.oValue1;
                //             else if (x.sPath.toUpperCase() == "SEASONCD") sSeasonCd = x.oValue1;
                //         }
                //     });
                // } else if (pFilters.length > 0) {
                //     var sName = pFilters[0].sPath.toUpperCase();
                //     var sValue = pFilters[0].oValue1;
                //     if (sName == "PLANTCD") sPlantCd = sValue;
                //     else if (sName == "IONO") sIONo = sValue;
                //     else if (sName == "PROCESSCD") sProcessCd = sValue;
                //     else if (sName == "STYLECD") sStyleCd = sValue;
                //     else if (sName == "SEASONCD") sSeasonCd = sValue;
                // } else {
                //     sPlantCd = "";
                //     sIONo = "",
                //     sProcessCd = "";
                //     sStyleCd = "";
                //     sSeasonCd = "";
                // }

                // var sFilter = "PLANTCD eq '" + sPlantCd + "' and IONO eq '" + sIONo + "' and PROCESSCD eq '" + sProcessCd + 
                //     "' and STYLECD eq '" + sStyleCd + "' and SEASONCD eq '" + sSeasonCd + "'";

                oModel.read('/IOSet', {
                    filters: aSmartFilter,
                    success: function (data, response) {
                        console.log("IOSet", data)

                        if (data.results.length > 0) {

                            data.results.forEach((item, idx) => {
                                if (idx == 0) item.ACTIVE = "X";
                                else item.ACTIVE = "";
                            });

                            var oTable = _this.getView().byId("ioTab");
                            var aFilterTab = [];
                            if (oTable.getBinding("rows")) {
                                aFilterTab = oTable.getBinding("rows").aFilters;
                            }

                            var oJSONModel = new sap.ui.model.json.JSONModel();
                            oJSONModel.setData(data);
                            _this.getView().setModel(oJSONModel, "io");
                            _this._tableRendered = "ioTab";
                            
                            if (pFilters.length > 0) {
                                //_this.onFilterBySmart("io", pFilters, "", aFilterTab);
                            } else {
                                _this.onFilterByCol("io", aFilterTab);
                            }

                            _this.setRowReadMode("io");

                            oTable.getColumns().forEach((col, idx) => {   
                                if (col._oSorter) {
                                    oTable.sort(col, col.mProperties.sortOrder === "Ascending" ? SortOrder.Ascending : SortOrder.Descending, true);
                                }
                            });

                            data.results.forEach((item, idx) => {
                                if (idx == 0) item.ACTIVE = "X";
                                else item.ACTIVE = "";
                            })

                            if (oTable.getBinding("rows").aIndices.length > 0) {
                                var aIndices = oTable.getBinding("rows").aIndices;
                                var sIONo = _this.getView().getModel("io").getData().results[aIndices[0]].IONO;
                                var sProcessCd = _this.getView().getModel("io").getData().results[aIndices[0]].PROCESSCD;
                                _this.getView().getModel("ui").setProperty("/activeIONo", sIONo);
                                _this.getView().getModel("ui").setProperty("/activeProcessCd", sProcessCd);
                                
                                _this.getStock();
                                _this.getMatDoc();
                            }
                        } else {
                            _this.getView().getModel("ui").setProperty("/activeIONo", "");
                            _this.getView().getModel("ui").setProperty("/activeProcessCd", "");

                            _this.getView().getModel("io").setProperty("/results", []);
                            _this.getView().getModel("stock").setProperty("/results", []);
                            _this.getView().getModel("matDoc").setProperty("/results", []);
                        }

                        // Set row count
                        _this.getView().getModel("ui").setProperty("/rowCountIO", data.results.length);

                        _this.closeLoadingDialog();
                    },
                    error: function (err) { 
                        console.log("error", err)
                        _this.closeLoadingDialog();
                    }
                })
            },

            getStock() {
                //_this.showLoadingDialog("Loading...");

                var sIONo = _this.getView().getModel("ui").getData().activeIONo;
                var sProcessCd = _this.getView().getModel("ui").getData().activeProcessCd;

                var oModel = this.getOwnerComponent().getModel();
                oModel.read('/StockSet', {
                    urlParameters: {
                        "$filter": "IONO eq '" + sIONo + "' and PROCESSCD eq '" + sProcessCd + "'"
                    },
                    success: function (data, response) {
                        console.log("StockSet", data)
                        if (data.results.length > 0) {

                            data.results.forEach((item, idx) => {
                                if (idx == 0) item.ACTIVE = "X";
                                else item.ACTIVE = "";
                            });

                            var oTable = _this.getView().byId("stockTab");
                            var aFilterTab = [];
                            if (oTable.getBinding("rows")) {
                                aFilterTab = oTable.getBinding("rows").aFilters;
                            }

                            var oJSONModel = new sap.ui.model.json.JSONModel();
                            oJSONModel.setData(data);
                            _this.getView().setModel(oJSONModel, "stock");
                            _this._tableRendered = "stockTab";

                            _this.onFilterByCol("stock", aFilterTab);

                            _this.setRowReadMode("stock");
                        } else {
                            _this.getView().getModel("stock").setProperty("/results", []);
                        }

                        // Set row count
                        _this.getView().getModel("ui").setProperty("/rowCountStock", data.results.length);

                        _this.closeLoadingDialog();
                    },
                    error: function (err) { 
                        console.log("error", err)
                        _this.closeLoadingDialog();
                    }
                })
            },

            getMatDoc() {
                //_this.showLoadingDialog("Loading...");

                var sIONo = _this.getView().getModel("ui").getData().activeIONo;
                var sProcessCd = _this.getView().getModel("ui").getData().activeProcessCd;

                var oModel = this.getOwnerComponent().getModel();
                oModel.read('/MatDocSet', {
                    urlParameters: {
                        "$filter": "HDRTEXT eq '" + sIONo + " " + sProcessCd + "'"
                    },
                    success: function (data, response) {
                        console.log("MatDocSet", data)
                        if (data.results.length > 0) {

                            data.results.forEach((item, idx) => {
                                if (item.POSTDT !== null) item.POSTDT = _this.formatDate(item.POSTDT)

                                if (idx == 0) item.ACTIVE = "X";
                                else item.ACTIVE = "";
                            });

                            var oTable = _this.getView().byId("matDocTab");
                            var aFilterTab = [];
                            if (oTable.getBinding("rows")) {
                                aFilterTab = oTable.getBinding("rows").aFilters;
                            }

                            var oJSONModel = new sap.ui.model.json.JSONModel();
                            oJSONModel.setData(data);
                            _this.getView().setModel(oJSONModel, "matDoc");
                            _this._tableRendered = "matDocTab";

                            _this.onFilterByCol("matDoc", aFilterTab);

                            _this.setRowReadMode("matDoc");
                        }
                        else {
                            _this.getView().getModel("matDoc").setProperty("/results", []);
                        }

                        // Set row count
                        _this.getView().getModel("ui").setProperty("/rowCountMatDoc", data.results.length);

                        _this.closeLoadingDialog();
                    },
                    error: function (err) { 
                        console.log("error", err)
                        _this.closeLoadingDialog();
                    }
                })
            },

            onRefreshIO() {
                _this.onSearch();
            },

            onPostConsumpStock: async function() {
                _this.showLoadingDialog("Loading...");

                var oTable = this.byId("stockTab");
                var aSelIdx = oTable.getSelectedIndices();

                if (aSelIdx.length === 0) {
                    MessageBox.information(_oCaption.INFO_NO_SELECTED);
                    _this.closeLoadingDialog();
                    return;
                }

                var aOrigSelIdx = [];
                aSelIdx.forEach(i => {
                    aOrigSelIdx.push(oTable.getBinding("rows").aIndices[i]);
                })

                var oDataIO = _this.getView().getModel("io").getData().results[0];
                var aData = _this.getView().getModel("stock").getData().results;
                var sCurrentDate = _this.formatDate(new Date());
                var sProfitctr = _this.getView().getModel("ui").getData().activePrctr;
                var sMsg = "";



                for(var i = 0; i < aOrigSelIdx.length; i++) {
                    var oData = aData[aOrigSelIdx[i]];

                    var oParam = {};
                    oParam["N_GOODSMVT_HEADER"] = [{
                        PstngDate: sCurrentDate + "T00:00:00",
                        DocDate: sCurrentDate + "T00:00:00",
                        RefDocNo: oDataIO.IONO + " " + oDataIO.PROCESSCD,
                        PrUname: _startUpInfo.id,
                        HeaderTxt: oDataIO.IONO + " " + oDataIO.PROCESSCD
                    }];

                    oParam["N_GOODSMVT_CODE"] = [{
                        GmCode: "03"
                    }];

                    oParam["N_GOODSMVT_PRINT_CTRL"] = [];
                    oParam["N_GOODSMVT_HEADRET"] = [];

                    oParam["N_GOODSMVT_ITEM"] = [{
                        "Material": oData.MATNO, 
                        "Plant":oDataIO.PLANTCD, 
                        "StgeLoc": oData.SLOC, 
                        "Batch": oData.BATCH,
                        "MoveType": "917", 
                        "EntryQnt": oData.QTY,
                        "EntryUom": oData.UOM,
                        "Costcenter": "VHKLSC004",
                        "Orderid": oDataIO.IONO,
                        "ProfitCtr" : sProfitctr
                    }]

                    oParam["N_GOODSMVT_RETURN"] = [];


                    console.log("oParam",oParam);
                    sMsg += await _this.onPost(oParam) + "\n";
                }

                _this.onRefreshStock();
                _this.onRefreshMatDoc();

                _this.closeLoadingDialog();

                MessageBox.information(sMsg);
            },

            onPost(pParam) {
                var oModelRFC = _this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");

                return new Promise((resolve, reject) => {
                    oModelRFC.create("/GoodsMvt_CreateSet", pParam, {
                        method: "POST",
                        success: function(oResult, oResponse) {
                            console.log("GoodsMvt_CreateSet", oResult, oResponse);
                            resolve(oResult.N_GOODSMVT_RETURN.results[0].Message);
                        },
                        error: function(err) {
                            console.log("GoodsMvt_CreateSet err", err);
                            resolve("");
                        }
                    });
                });
            },

            onRefreshStock() {
                _this.getStock();
            },

            onCancelConsumpMatDoc: async function() {
                _this.showLoadingDialog("Loading...");

                var oTable = this.byId("matDocTab");
                var aSelIdx = oTable.getSelectedIndices();

                if (aSelIdx.length === 0) {
                    MessageBox.information(_oCaption.INFO_NO_SELECTED);
                    _this.closeLoadingDialog();
                    return;
                }

                var aOrigSelIdx = [];
                aSelIdx.forEach((i, idx) => {
                    aOrigSelIdx.push(oTable.getBinding("rows").aIndices[i]);
                })

                var aData = _this.getView().getModel("matDoc").getData().results;
                var sMsg = "";

                for(var i = 0; i < aOrigSelIdx.length; i++) {
                    var oData = aData[aOrigSelIdx[i]];

                    var oParam = {
                        "N_IT_DATA": [],
                        "N_ET_DATA": []
                    };

                    oParam["N_IT_DATA"].push({
                        PostingDate: _this.formatDate(new Date(oData.POSTDT)) + "T00:00:00",
                        MatDoc: oData.MATDOCNO,
                        MatDocYear: oData.MATDOCYEAR
                    })

                    sMsg += await _this.onCancel(oParam);
                }

                _this.onRefreshStock();
                _this.onRefreshMatDoc();

                _this.closeLoadingDialog();

                MessageBox.information(sMsg);
            },

            onCancel(pParam) {
                var oModelRFC = _this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");

                return new Promise((resolve, reject) => {
                    oModelRFC.create("/GoodsMvt_CancelSet", pParam, {
                        method: "POST",
                        success: function(oResult, oResponse) {
                            console.log("GoodsMvt_CancelSet", oResult, oResponse);
                            
                            var sMessage = "";
                            oResult.N_ET_DATA.results.forEach(item => {
                                sMessage += item.Message + "\n";
                            })

                            resolve(sMessage);
                        },
                        error: function(err) {
                            console.log("GoodsMvt_CancelSet err", err);
                            resolve("");
                        }
                    });
                })
            },

            onDispDtlMatDoc() {
                _this.showLoadingDialog("Loading...");

                var oTable = this.byId("matDocTab");
                var aSelIdx = oTable.getSelectedIndices();

                if (aSelIdx.length === 0) {
                    MessageBox.information(_oCaption.INFO_NO_SELECTED);
                    _this.closeLoadingDialog();
                    return;
                }

                var aOrigSelIdx = [];
                aSelIdx.forEach(i => {
                    aOrigSelIdx.push(oTable.getBinding("rows").aIndices[i]);
                })

                var oModel = _this.getOwnerComponent().getModel();
                var aData = [];

                aOrigSelIdx.forEach((item, idx) => {
                    var oData = _this.getView().getModel("matDoc").getProperty("/results/" + item.toString());
                    var sMatDocNo = oData.MATDOCNO;
                    var sMatDocYear = oData.MATDOCYEAR;

                    oModel.read('/MatDocDtlSet', { 
                        urlParameters: {
                            "$filter": "MATDOCNO eq '" + sMatDocNo + "' and MATDOCYEAR eq '" + sMatDocYear + "'"
                        },
                        success: function (data, response) {
                            console.log("MatDocDtlSet", data)

                            aData.push(...data.results);

                            if (idx == aOrigSelIdx.length - 1) {
                                aData.forEach((item, idx) => {
                                    if (idx == 0) item.ACTIVE = "X";
                                    else item.ACTIVE = "";
                                });

                                var oJSONModel = new sap.ui.model.json.JSONModel();
                                oJSONModel.setData({ results: aData });
                                _this.getView().setModel(oJSONModel, "matDocDtl");
        
                                _this._MatDocDtlDialog = sap.ui.xmlfragment(_this.getView().getId(), "zuiprdconsump.view.fragments.MatDocDtlDialog", _this);
                                _this._MatDocDtlDialog.setModel(oJSONModel);
                                _this.getView().addDependent(_this._MatDocDtlDialog);
            
                                _this._MatDocDtlDialog.addStyleClass("sapUiSizeCompact");
                                _this._MatDocDtlDialog.open();
            
                                _this.closeLoadingDialog();
                            }
                        },
                        error: function (err) { 
                            console.log("MatDocDtlSet error", err);
                            _this.closeLoadingDialog();
                        }
                    })
                })
            },

            onMatDocDtlClose() {
                _this._MatDocDtlDialog.destroy(true);
            },

            onRefreshMatDoc() {
                _this.getMatDoc();
            },

            onCellClickIO(oEvent) {
                var sIONo = oEvent.getParameters().rowBindingContext.getObject().IONO;
                var sProcessCd = oEvent.getParameters().rowBindingContext.getObject().PROCESSCD;
                var sPrctr = oEvent.getParameters().rowBindingContext.getObject().PRCTR;
                
                _this.getView().getModel("ui").setProperty("/activeIONo", sIONo);
                _this.getView().getModel("ui").setProperty("/activeProcessCd", sProcessCd);
                _this.getView().getModel("ui").setProperty("/activePrctr", sPrctr);

                this.getStock();
                this.getMatDoc();

                _this.onCellClick(oEvent);

                // Clear Sort and Filter
                this.clearSortFilter("stockTab");
                this.clearSortFilter("matDocTab");
            },

            onRefreshHK() {
                if (_this.getView().getModel("base").getData().dataMode == "READ") {
                    if (this._sActiveTable === "ioTab") this.onRefreshIO();
                    else if (this._sActiveTable === "stockTab") this.onRefreshStock();
                    else if (this._sActiveTable === "matDocTab") this.onRefreshMatDoc();
                }
            },

            onKeyUp(oEvent) {
                if ((oEvent.key == "ArrowUp" || oEvent.key == "ArrowDown") && oEvent.srcControl.sParentAggregationName == "rows") {
                    var oTable = this.byId(oEvent.srcControl.sId).oParent;

                    var sModel = "";
                    if (oTable.getId().indexOf("ioTab") >= 0) sModel = "io";
                    else if (oTable.getId().indexOf("stockTab") >= 0) sModel = "stock";
                    else if (oTable.getId().indexOf("matDocTab") >= 0) sModel = "matDoc";

                    if (sModel == "io") {
                        var sRowId = this.byId(oEvent.srcControl.sId);
                        var sRowPath = this.byId(oEvent.srcControl.sId).oBindingContexts["io"].sPath;
                        var oRow = this.getView().getModel("io").getProperty(sRowPath);
                        var sIONo = oRow.IONO;
                        var sProcessCd = oRow.PROCESSCD;

                        this.getView().getModel("ui").setProperty("/activeIONo", sIONo);
                        this.getView().getModel("ui").setProperty("/activeProcessCd", sProcessCd);

                        this.getStock();
                        this.getMatDoc();
                    }

                    if (this.byId(oEvent.srcControl.sId).getBindingContext(sModel)) {
                        var sRowPath = this.byId(oEvent.srcControl.sId).getBindingContext(sModel).sPath;

                        oTable.getModel(sModel).getData().results.forEach(row => row.ACTIVE = "");
                        oTable.getModel(sModel).setProperty(sRowPath + "/ACTIVE", "X");

                        oTable.getRows().forEach(row => {
                            if (row.getBindingContext(sModel) && row.getBindingContext(sModel).sPath.replace("/results/", "") === sRowPath.replace("/results/", "")) {
                                row.addStyleClass("activeRow");
                            }
                            else row.removeStyleClass("activeRow")
                        })
                    }
                }
            },

            onTableResize(pGroup, pType) {
                if (pGroup == "io") {
                    if (pType === "Max") {
                        this.byId("btnFullScreenIO").setVisible(false);
                        this.byId("btnExitFullScreenIO").setVisible(true);

                        var oSplitterMain = new sap.ui.layout.SplitterLayoutData({size: "100%"});
                        var oContMain = this.byId("vbPORel");
                        oContMain.setLayoutData(oSplitterMain);
                    }
                    else {
                        this.byId("btnFullScreenIO").setVisible(true);
                        this.byId("btnExitFullScreenIO").setVisible(false);

                        var oSplitterMain = new sap.ui.layout.SplitterLayoutData({size: "58%"});
                        var oContMain = this.byId("vbPORel");
                        oContMain.setLayoutData(oSplitterMain);
                    }
                }
                else if (pGroup == "stock") {
                    if (pType === "Max") {
                        this.byId("btnFullScreenStock").setVisible(false);
                        this.byId("btnExitFullScreenStock").setVisible(true);

                        var oSplitterMain = new sap.ui.layout.SplitterLayoutData({size: "0%"});
                        var oContMain = this.byId("vbPORel");
                        oContMain.setLayoutData(oSplitterMain);

                        var oSplitterDtl = new sap.ui.layout.SplitterLayoutData({size: "100%"});
                        var oContDtl = this.byId("stockTab");
                        oContDtl.setLayoutData(oSplitterDtl);
                    }
                    else {
                        this.byId("btnFullScreenStock").setVisible(true);
                        this.byId("btnExitFullScreenStock").setVisible(false);

                        var oSplitterMain = new sap.ui.layout.SplitterLayoutData({size: "58%"});
                        var oContMain = this.byId("vbPORel");
                        oContMain.setLayoutData(oSplitterMain);

                        var oSplitterDtl = new sap.ui.layout.SplitterLayoutData({size: "50%"});
                        var oContDtl = this.byId("stockTab");
                        oContDtl.setLayoutData(oSplitterDtl);
                    }
                }
                else if (pGroup == "matDoc") {
                    if (pType === "Max") {
                        this.byId("btnFullScreenMatDoc").setVisible(false);
                        this.byId("btnExitFullScreenMatDoc").setVisible(true);

                        var oSplitterMain = new sap.ui.layout.SplitterLayoutData({size: "0%"});
                        var oContMain = this.byId("vbPORel");
                        oContMain.setLayoutData(oSplitterMain);

                        var oSplitterDtl = new sap.ui.layout.SplitterLayoutData({size: "0%"});
                        var oContDtl = this.byId("stockTab");
                        oContDtl.setLayoutData(oSplitterDtl);
                    }
                    else {
                        this.byId("btnFullScreenMatDoc").setVisible(true);
                        this.byId("btnExitFullScreenMatDoc").setVisible(false);

                        var oSplitterMain = new sap.ui.layout.SplitterLayoutData({size: "58%"});
                        var oContMain = this.byId("vbPORel");
                        oContMain.setLayoutData(oSplitterMain);

                        var oSplitterDtl = new sap.ui.layout.SplitterLayoutData({size: "50%"});
                        var oContDtl = this.byId("stockTab");
                        oContDtl.setLayoutData(oSplitterDtl);
                    }
                }
            },

            onSaveTableLayout: function (oEvent) {
                var ctr = 1;
                var oTable = oEvent.getSource().oParent.oParent;
                var oColumns = oTable.getColumns();
                var sSBU = _this.getView().getModel("ui").getData().sbu;

                var oParam = {
                    "SBU": sSBU,
                    "TYPE": "",
                    "TABNAME": "",
                    "TableLayoutToItems": []
                };

                _aTableProp.forEach(item => {
                    if (item.tblModel == oTable.getBindingInfo("rows").model) {
                        oParam['TYPE'] = item.modCode;
                        oParam['TABNAME'] = item.tblSrc;
                    }
                });

                oColumns.forEach((column) => {
                    oParam.TableLayoutToItems.push({
                        COLUMNNAME: column.mProperties.sortProperty,
                        ORDER: ctr.toString(),
                        SORTED: column.mProperties.sorted,
                        SORTORDER: column.mProperties.sortOrder,
                        SORTSEQ: "1",
                        VISIBLE: column.mProperties.visible,
                        WIDTH: column.mProperties.width.replace('px','')
                    });

                    ctr++;
                });

                var oModel = _this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                oModel.create("/TableLayoutSet", oParam, {
                    method: "POST",
                    success: function(data, oResponse) {
                        MessageBox.information(_oCaption.INFO_LAYOUT_SAVE);
                    },
                    error: function(err) {
                        MessageBox.error(err);
                        _this.closeLoadingDialog();
                    }
                });                
            },

            getCaption() {
                var oJSONModel = new JSONModel();
                var oDDTextParam = [];
                var oDDTextResult = {};
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                
                // Smart Filter
                oDDTextParam.push({CODE: "PLANTCD"});
                oDDTextParam.push({CODE: "IONO"});
                oDDTextParam.push({CODE: "PROCESSCD"});
                oDDTextParam.push({CODE: "STYLENO"});
                oDDTextParam.push({CODE: "SEASON"});

                // Label
                oDDTextParam.push({CODE: "IO"});
                oDDTextParam.push({CODE: "STOCK"});
                oDDTextParam.push({CODE: "MATDOC"});
                oDDTextParam.push({CODE: "POSTCONSUMP"});
                oDDTextParam.push({CODE: "CANCELCONSUMP"});
                oDDTextParam.push({CODE: "DISPDTL"});
                oDDTextParam.push({CODE: "ITEM(S)"});

                // Button
                oDDTextParam.push({CODE: "SEARCH"});
                oDDTextParam.push({CODE: "REFRESH"});
                oDDTextParam.push({CODE: "FULLSCREEN"});
                oDDTextParam.push({CODE: "EXITFULLSCREEN"});
                oDDTextParam.push({CODE: "SAVELAYOUT"});

                // Dialog
                oDDTextParam.push({CODE: "MATNO"});
                oDDTextParam.push({CODE: "MATDESC"});
                oDDTextParam.push({CODE: "ADDTLDESC"});
                oDDTextParam.push({CODE: "BATCH"});
                oDDTextParam.push({CODE: "SLOC"});
                oDDTextParam.push({CODE: "QTY"});
                oDDTextParam.push({CODE: "UOM"});

                // MessageBox
                oDDTextParam.push({CODE: "INFO_NO_SELECTED"});
                oDDTextParam.push({CODE: "INFO_LAYOUT_SAVE"});
                
                oModel.create("/CaptionMsgSet", { CaptionMsgItems: oDDTextParam  }, {
                    method: "POST",
                    success: function(oData, oResponse) {
                        // console.log(oData.CaptionMsgItems.results)
                        oData.CaptionMsgItems.results.forEach(item => {
                            oDDTextResult[item.CODE] = item.TEXT;
                        })

                        oJSONModel.setData(oDDTextResult);
                        _this.getView().setModel(oJSONModel, "caption");

                        _oCaption = _this.getView().getModel("caption").getData();
                    },
                    error: function(err) {
                        sap.m.MessageBox.error(err);
                        _this.closeLoadingDialog();
                    }
                });
            }
        });
    });
