import $ from "jquery";
import {GetData, BuildURL} from "../common/common";
import "jqGrid/js/jquery.jqGrid"
import "jqGrid/js/grid.grouping"
import "jqGrid/js/i18n/grid.locale-cn"

import "datatables.net"
import * as url from "url";

// @ts-ignore
$.jgrid.defaults.iconSet = 'fontAwesome';

export class class_table_object {
    api_data = "/api/v1"
    api_params = new Map<string, string>()

    ref_main: any = $('<table id="jqGridTable"/>')
    ref_pager = $('<div id="jqGridPager"/>')

    obj_table: class_table_object | undefined

    data = []
    rowIds = []
    goods_count = 0
    out_count = 0;
    current_gid = "";
    current_page = 0;
    current_row = 0;
    current_count = 10;

    constructor(parent: JQuery, api_data: string, fields: jqGridField[], group_fields: string[]) {
        // console.log("create class_table", parent, api_data, fields, group_fields)
        this.api_data = api_data

        parent.append(this.ref_main).append(this.ref_pager);

        this.ref_main.jqGrid({
            url: this.api_data,
            mtype: "GET",
            colModel: fields,
            styleUI: 'Bootstrap4',
            datatype: 'json',
            rownumbers: false,
            height: 1200,
            rowList: [5, 10, 20, 30, 50],
            rowNum: 10,
            autowidth: true,
            pager: this.ref_pager,
            grouping: group_fields.length > 0,
            groupingView: {
                groupField: group_fields,
                groupColumnShow: [false],
                groupText: ["<b style='display: inline-block;width: 130px;'>{0}</b>"],
                groupCollapse: false
            },
        });

        //列居中
        $(".ui-th-column").css("text-align","center")

        let intv = setInterval(() => {
            if (!this.page_resize()) {
                $(window).off("resize")
                clearInterval(intv)
            }
        }, 10000)

        $(window).on("resize", () => {
            setTimeout(() => {
                this.page_resize()
            }, 50);
        });
        this.page_resize()
    }

    set_grid_url(url:string) {
        console.log("update grid url:",url)
        if (url != "") {
            this.api_data = url
            this.ref_main.setGridParam({url: url})
            this.reload()
        }
    }

    // data {key:"value",key:"value"}
    set_grid_post_data(data:any) {
        if (data != null) {
            this.ref_main.setGridParam({postData:data})
            this.reload()
        }
    }

    page_resize(): boolean {
        try {
            let boxWidth = $(".card").outerWidth()
            let pager = this.ref_pager
            // @ts-ignore
            let boxHeight = $(window).height() - $(".card-body").offset().top - $(".card-header").outerHeight() - pager.outerHeight() - $(".main-footer").outerHeight()
            this.ref_main.jqGrid('setGridHeight', (boxHeight > 0) ? boxHeight : 0);
            this.ref_main.jqGrid('setGridWidth', boxWidth);
            return true
        } catch {
            console.warn("table lost")
            return false
        }
        // var p = this.ref_main.closest('[class*="col-"]')
        // this.ref_main.jqGrid("setGridWidth", p.width())
        // return true
    }

    reload() {
        this.ref_main.trigger('reloadGrid');
    }
}