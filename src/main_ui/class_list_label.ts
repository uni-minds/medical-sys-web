import {OpenLabelTool, TimeFormat, GetData} from "../common/common";
import "select2"
import {class_table_object} from "./class_table";
import $ from "jquery";
import * as Url from "url";

export class class_list_label {
    api_root: string
    api_labelsys: string
    ui_root: string
    ref_main: JQuery
    medialist_selectors: MedialistGroupDefine[]

    media_type = ""

    objLabelGroupSelector
    objScreenGroupSelector
    objViewSelector
    objReviewSelector

    objSelectorHeader

    ref_card_body: JQuery | undefined
    ref_table: any

    userSelectGroupId = 0
    userSelectViewId = ""
    userIgnoreProgressCheck = false

    select_labelGroupId_type: string = ""

    urlPullData = ""
    urlPullDataParams = new Map<string, string>()


    constructor(parent: JQuery, selectors: MedialistGroupDefine[], api_root: string, ui_root: string, media_type: string) {
        console.log("init list_label", selectors, api_root, ui_root, media_type)
        this.medialist_selectors = selectors
        this.api_root = api_root
        this.api_labelsys = api_root + "/labelsys/stream/index"
        this.ui_root = ui_root
        this.ref_main = $('<div class="card"></div>')
        this.media_type = media_type

        parent.append(this.ref_main);

        this.objLabelGroupSelector = $('<select class="form-control" style="width: 100%;"/>')
        this.objScreenGroupSelector = $('<select class="form-control" style="width: 100%;"/>')
        this.objViewSelector = $('<select class="form-control" style="width: 100%;"/>')
        this.objReviewSelector = $('<select class="form-control" style="width: 100%;"/>')


        let objH1 = $(`<div class="card-header"><div class="card-title">媒体列表</div></div>`);
        let objH2 = $('<div class="p-0 row text-center"/>')
        this.ref_main.append(objH1).append($(`<div class="card-header"/>`).append(objH2))
        this.objSelectorHeader = objH2
    }

    async Start() {
        let num = 12 / this.medialist_selectors.length
        for (const selector of this.medialist_selectors) {
            let obj_selector_group = $(`<div class="col-md-${num}"></div>`)
            let optionTitle = $(`<div class="p-0 text-info">${selector.name}</div>`)
            let optionGroup = $('<div class="pb-0" style="width:100%"></div>')
            obj_selector_group.append(optionTitle).append(optionGroup)

            switch (selector.id) {
                case "selectLabelGroupId":
                    GetData(`${this.api_root}/group?action=getlistfull&type=${selector.type}`).then((data) => {
                        let resp = data as ServerResponse
                        if (resp.code == 200) {
                            let obj1 = this.objLabelGroupSelector
                            obj1.on("change", e => {
                                this.UserSelect({"selectLabelGroupId": $(e.target).val()})
                            })
                            optionGroup.append(obj1)
                            this.SelectorRenewData(obj1, resp.data, false)
                            obj1.select2({theme: 'bootstrap4'})
                        }
                    })
                    break


                case "selectScreenGroupId":
                    GetData(`${this.api_root}/group?action=getlistfull&type=${selector.type}`).then((data) => {
                        if (!data) {
                            return
                        }
                        let resp = data as ServerResponse
                        if (resp.code == 200) {
                            let obj2 = this.objScreenGroupSelector
                            obj2.on("change", e => {
                                this.UserSelect({"selectScreenGroupId": $(e.target).val()})
                            })
                            optionGroup.append(obj2)
                            this.SelectorRenewData(obj2, resp.data, false)
                            obj2.select2({theme: 'bootstrap4'})
                        }
                    })

                    break

                case "selectView":
                    let data: ServerGroupData[] = []

                    let obj3 = this.objViewSelector
                    obj3.on("change", e => {
                        this.UserSelect({"selectViewId": $(e.target).val()})
                    })
                    optionGroup.append(obj3)
                    this.SelectorRenewData(obj3, data, false)
                    obj3.select2({theme: 'bootstrap4'})

                    break

                case "showReviewedOnly":
                    let viewdata: ServerGroupData[] = [{Gid: "1", Name: "是", GType: ""}, {
                        Gid: "0",
                        Name: "否",
                        GType: ""
                    }]
                    let obj4 = this.objReviewSelector
                    obj4.on("change", e => {
                        this.UserSelect({"showReviewedOnly": $(e.target).val()})
                    })
                    optionGroup.append(obj4)
                    this.SelectorRenewData(obj4, viewdata, true)
                    obj4.select2({theme: 'bootstrap4'})

                    break
            }
            this.objSelectorHeader.append(obj_selector_group)
        }
    }

    SelectorRenewData(objSelector: JQuery, data: ServerGroupData[], nodefault: boolean) {
        // console.log("renew dropmenu",data)
        objSelector.children().remove()
        if (!nodefault) {
            let objOption = $(`<option value="-1">未选择</option>`)
            objSelector.append(objOption)
        }
        if (data == null || data.length === 0) {
            objSelector.attr("disabled", "disable")
        } else {
            objSelector.removeAttr("disabled")
            data.forEach(v => {
                let objOption = $(`<option value="${v.Gid}">${v.Name}</option>`)
                objSelector.append(objOption)
            })
        }

        return objSelector
    }

    async UserSelect(data: any) {
        if (!data) {
            console.warn("user select empty data")
            return
        }

        console.log("user select:", data)

        let groupId = 0

        for (let k in data) {
            switch (k) {
                case "showReviewedOnly":
                    let val = data["showReviewedOnly"]
                    this.userIgnoreProgressCheck = (val !== "1")
                    break

                case "selectLabelGroupId":
                    groupId = data["selectLabelGroupId"]
                    if (groupId < 0) {
                        console.warn("user select label gid -1")
                        return
                    }
                    this.userSelectGroupId = groupId
                    this.userSelectViewId = ""
                    break

                case "selectScreenGroupId":
                    groupId = data["selectScreenGroupId"]
                    if (groupId < 0) {
                        console.warn("user select screen gid -1")
                        return
                    }

                    this.userSelectGroupId = groupId
                    this.userSelectViewId = ""

                    let getViewUrl = `${this.api_root}/group_${this.media_type}/${groupId}/view`
                    if (this.userIgnoreProgressCheck) {
                        getViewUrl += '&ignoreProgressCheck=1'
                    }

                    let groupView = await GetData(getViewUrl) as ServerResponse
                    if (groupView.code === 200) {
                        let view_data = groupView.data as string[]
                        let data: ServerGroupData[] = []
                        if (view_data !== null && view_data.length > 0) {
                            view_data.forEach(v => {
                                data.push({Gid: v, Name: v, GType: ""})
                            })
                        }
                        this.SelectorRenewData(this.objViewSelector, data, false)
                    }
                    break

                case "selectViewId":
                    this.userSelectViewId = data["selectViewId"]
                    break

            }
        }

        if (this.userSelectGroupId > 0) {
            this.urlPullData = `${this.api_root}/medialist/group_${this.media_type}/${this.userSelectGroupId}/list`
            if (this.userSelectViewId !== "-1") {
                // this.urlPullData += `&view=${this.userSelectViewId}`
                this.urlPullDataParams.set("view", this.userSelectViewId)
            } else {
                this.urlPullDataParams.delete("view")
            }
        }

        if (this.userIgnoreProgressCheck) {
            this.urlPullDataParams.set("ignoreProgressCheck", "1")
        } else {
            this.urlPullDataParams.delete("ignoreProgressCheck")
        }

        // console.log("update data pull url:", this.urlPullData)
        this.CreateCardBody(1);
    }

    // Load favourite
    LoadUserLastStatus() {
        GetData(`${this.api_root}/user?action=laststatus`).then((data) => {
            if (!data) {
                return
            }
            let resp = data as ServerResponse
            if (resp.code === 200) {
                return JSON.parse(resp.data);
            }
        })
    }

    async CreateSelectors() {
        let objMargin = $('<div class="card-body"/>').addClass("margin row")
        this.ref_main.append(objMargin)
        for (let selector of this.medialist_selectors) {

            let obj1 = $('<button/>').attr("type", "button").addClass("btn btn-info").text(selector.name)
            let obj2 = $('<button/>').attr("type", "button").addClass("btn btn-info dropdown-toggle dropdown-hover dropdown-icon").attr("data-toggle", "dropdown")
            let obj3 = $("<span class='sr-only'>DropDown</span>")
            let btnGroup = $('<div class="btn-group col-md-2"/>')
            obj2.append(obj3)
            btnGroup.append(obj1).append(obj2)

            if (selector.id === "labelGroupId") {
                let response = await GetData(`${this.api_root}/group?action=getlistfull`) as ServerResponse

                if (response.code === 200) {
                    let data = response.data as ServerGroupData[]
                    let objMenu = $('<div class="dropdown-menu" role="menu" style="height:300px;overflow:scroll"></div>')
                    data.forEach(v => {
                        let objItem = $('<a class="dropdown-item" href="#">').text(v.Name)
                            .attr("Gtype", v.GType).attr("Gid", v.Gid).on("click", () => {
                                this.select_labelGroupId_type = v.GType
                                console.log("LOG", v.GType)
                                this.CreateCardBody(1);
                            });
                        objMenu.append(objItem)
                    })
                    btnGroup.append(objMenu)
                }
            }
            objMargin.append(btnGroup)
        }
    }

    CreateCardBody(page_index: number) {
        this.ref_card_body?.remove()
        this.ref_card_body = $("<div id='media-table' />").addClass("card-body").css("padding", 0);
        this.ref_main.append(this.ref_card_body);

        let ref_media_table = $("<div />");
        this.ref_card_body.append(ref_media_table);

        this.OpBindOnAuthorButtons(ref_media_table)
        this.OpBindOnReviewerButtons(ref_media_table)

        let fields: jqGridField[] = []
        fields.push({label: "ID", name: "mid", width: 30, hidden: false, summaryType: '', formatter: this.FormatId})
        fields.push({
            label: "名称",
            name: "name",
            width: 80,
            hidden: false,
            summaryType: '',
            formatter: this.FormatName
        })
        fields.push({
            label: "时长",
            name: "duration",
            width: 100,
            hidden: true,
            summaryType: 'sum',
            formatter: TimeFormat
        })
        fields.push({label: "总帧", name: "frames", width: 30, hidden: false, summaryType: '', formatter: undefined})
        fields.push({
            label: "切面",
            name: "view",
            width: 40,
            hidden: false,
            summaryType: '',
            formatter: this.FormatViewContent
        })
        fields.push({
            label: "标注",
            name: "authors",
            width: 60,
            hidden: false,
            summaryType: '',
            formatter: this.LabelAuthorRender
        })
        fields.push({
            label: "审阅",
            name: "reviews",
            width: 60,
            hidden: false,
            summaryType: '',
            formatter: this.LabelReviewRender
        })
        fields.push({label: "备注", name: "memo", width: 80, hidden: false, summaryType: '', formatter: undefined})

        let obj_table = new class_table_object(ref_media_table, `${this.api_root}/medialist/group_${this.media_type}/${this.userSelectGroupId}/list`, fields, [])
    }

    /**
     * @return {string}
     */
    FormatViewContent(value: any): string {
        // console.log("View:",value)
        if (value.startsWith('[')) {
            let v = JSON.parse(value);
            let t = "";
            v.forEach((e: string) => {
                t += e + "; "
            });
            t = t.substring(0, t.length - 2);
            return t

        } else {
            return value
        }
    }

    FormatId(value: string) {
        let ids = value.split(".")
        if (ids.length <= 1) {
            return value
        } else if (ids.length >= 12) {

            return `D${ids[11]}`
        } else {
            console.log(value)
            return "None"
        }
    }

    FormatName(value: string): string {
        const dicom_us_id = "1.2.276.0.26.1.1.1.2."
        const SOP_US_IMAGE = "1.2.840.10008.5.1.4.1.1.6.1"
        const SOP_US_ENHANCE_VOLUME = "1.2.840.10008.5.1.4.1.1.6.2"
        const SOP_MULTI_FRAME = "1.2.840.10008.5.1.4.1.1.3.1"
        const SOP_SECONDARY_SCREEN = "1.2.840.10008.5.1.4.1.1.7"
        const SOP_COMPREHENSIVE_SR = "1.2.840.10008.5.1.4.1.1.88.33"

        if (value.indexOf(dicom_us_id) >= 0) {
            // dicom us
            return value.replace(dicom_us_id, "d.us.")
        } else {
            // console.log("miss",value)
            return value
        }
    }

    /**
     * @return {null}
     */
    LabelAuthorRender(data_col: ServerLabelInfoForJsGridButton[], options: any, data_row: ServerMediaInfoForJsGrid) {
        // 仅渲染首个标注
        const media_uuid = data_row.media
        const obj = $("<div>").attr("media-uuid", media_uuid).addClass("btn btn-sm btn-block row col-sm-9 offset-sm-1")
            .addClass("custom-btn-author")

        if (data_col.length < 1) {
            // no author
            obj.addClass("btn-default").text("未标注")
            return obj.prop("outerHTML")
        }

        // 存在标注者
        const author = data_col[0]
        console.warn("only show first author", author)
        obj.text(author.realname).attr("label-uuid", author.uuid)
        switch (author.status) {
            case "using":
                obj.addClass("btn-info")
                break

            case "submit":
                obj.addClass("btn-warning")
                break

            case "a_reject":
                obj.addClass("btn-danger")
                break

            default:
                obj.addClass("btn-default").text("异常状态")
                console.error("create author button status:", author.realname, author.status)
                break
        }

        return obj.prop("outerHTML")
    }

    LabelReviewRender(data_col: ServerLabelInfoForJsGridButton[], options: any, data_row: ServerMediaInfoForJsGrid) {
        if (data_col.length < 1) {
            return ""
        }
        const reviewer = data_col[0]
        console.warn("only show first reviewer", reviewer)

        const media_uuid = data_row.media
        const label_uuid = reviewer.uuid

        const obj = $("<div>").attr("media-uuid", media_uuid).attr("label-uuid", label_uuid)
            .addClass("btn btn-sm btn-block row col-sm-9 offset-sm-1 custom-btn-reviewer").text(reviewer.realname)

        switch (reviewer.status) {
            case "using":
                obj.addClass("btn-info")
                break

            case "submit":
                obj.addClass("btn-warning")
                break

            case "r_warning":
                obj.addClass("btn-danger")
                break

            case "r_confirm":
                obj.addClass("btn-primary")
                break

            case "free":
            case "":
                obj.addClass("btn-default").text("未审阅")
                break

            default:
                return ""

        }
        let html = obj.prop("outerHTML")
        console.log(html)
        return html
    }

    LabelsysMediaLockCheckFree(uuid: string) {
        return new Promise((resolve, reject) => {
                let url_lock = `${this.api_labelsys}/${uuid}/lock/data`
                GetData(url_lock).then((resp: any) => {
                        resolve(resp.code == 400)
                    }
                )
            }
        )
    }


    OpBindOnAuthorButtons(parent: JQuery) {
        //custom-btn-author
        parent.on("mouseenter", ".custom-btn-author", (e: any) => {
            let btn = $(e.target).off("click")
            let media_uuid = ""
            let tmp = btn.attr("media-uuid")
            if (tmp != undefined) {
                media_uuid = tmp
            } else {
                console.error("author button without media_uuid")
                return
            }

            let label_uuid = "data"
            tmp = btn.attr("label-uuid")
            if (tmp != undefined) {
                label_uuid = tmp
            }

            console.warn("btn_mouse_enter", media_uuid, label_uuid)

            let url_summary = `${this.api_labelsys}/${media_uuid}/label/summary?do=author`

            GetData(url_summary).then((data) => {
                let resp = data as ServerResponse

                switch (resp.code) {
                    case 200:
                        const summary = resp.data as ServerLabelSummary
                        console.log("author summary:", summary)

                        switch (summary.ReviewProgress) {
                            case "using":
                                btn.attr('title', summary.AuthorTips).addClass("btn-danger").on("click", () => {
                                    alert("审阅中，禁止修改标注")
                                })
                                break;

                            default:
                                btn.attr('title', summary.AuthorTips).addClass("btn-info").text("开始标注").on("click", () => {
                                    this.LabelsysMediaLockCheckFree(media_uuid).then((ok) => {
                                        if (!ok) {
                                            // 无法获得媒体锁
                                            btn.removeClass('btn-warning btn-info btn-default').addClass('btn-danger').text("已被他人锁定");
                                            return
                                        } else {
                                            OpenLabelTool(this.ui_root, "stream", media_uuid, 'author', label_uuid)
                                        }

                                    })

                                })
                        }
                        break

                    case 30001:
                        //不存在标注信息
                        btn.attr('title', "未标注").text("开始标注").addClass("btn-info").on("click", () => {
                            OpenLabelTool(this.ui_root, "stream", media_uuid, 'author', "author")
                        })
                        break

                    case 403:
                        //已分配他人
                        btn.attr('title', '已由他人标注').addClass("btn-secondary")
                        break
                }
            })
        }).on("mouseleave", ".custom-btn-author", (e: any) => {
            let btn = $(e.target).off('click').removeClass('btn-default btn-info btn-warning btn-danger btn-secondary')

            let media_uuid = ""
            let tmp = btn.attr("media-uuid")
            if (tmp != undefined) {
                media_uuid = tmp
            } else {
                console.error("author button without media_uuid")
                return
            }

            let label_uuid = "data"
            tmp = btn.attr("label-uuid")
            if (tmp != undefined) {
                label_uuid = tmp
            }

            console.warn("btn_mouse_leave", media_uuid, label_uuid)

            let url_summary = `${this.api_labelsys}/${media_uuid}/label/summary?do=author`
            GetData(url_summary).then(data => {
                if (!data) {
                    return
                }
                let resp = data as ServerResponse
                switch (resp.code) {
                    case 200:
                        //存在标注信息
                        let summary = resp.data as ServerLabelSummary

                        switch (summary.AuthorProgress) {
                            case "using":
                                btn.addClass("btn-info").text(summary.AuthorRealname)
                                break

                            case "submit":
                                btn.addClass("btn-warning").text(summary.AuthorRealname)
                                break

                            case "a_reject":
                                btn.addClass("btn-danger").text(summary.AuthorRealname)
                                break

                            case "":
                            case "free":
                            default:
                                btn.addClass("btn-default").text("未标注");
                                break
                        }
                        break

                    case 30001:
                        //不存在标注信息
                        btn.attr('title', "未标注").addClass("btn-default").text("未标注")
                        return
                }
            })
        })
    }

    OpBindOnReviewerButtons(parent: JQuery) {
        let selector = ".custom-btn-reviewer"
        //custom-btn-reviewer
        parent.on("mouseenter", selector, (e: any) => {
            let btn = $(e.target).off("click")
            let tmp = btn.attr("media-uuid")
            let media_uuid = tmp ? tmp : ""

            tmp = btn.attr("label-uuid")
            let label_uuid = tmp ? tmp : ""

            let url_summary = `${this.api_labelsys}/${media_uuid}/label/summary?do=reviewer`

            GetData(url_summary).then((data) => {
                let resp = data as ServerResponse

                switch (resp.code) {
                    case 200:
                        const summary = resp.data as ServerLabelSummary
                        console.log("reviewer summary:", summary)

                        let obj = btn.attr('title', summary.ReviewTips).removeClass('btn-default btn-info btn-primary btn-warning btn-danger')
                        switch (summary.AuthorProgress) {
                            case "using":
                                obj.addClass("btn-danger").click(function () {
                                    alert("作者修改中，尚未提交审阅")
                                })
                                break;

                            default:
                                obj.addClass("btn-info").text("开始审阅").click(() => {
                                    OpenLabelTool(this.ui_root, "stream", media_uuid, 'review', label_uuid)
                                })
                        }

                        break
                }
            })
        }).on("mouseleave", selector, (e: any) => {
            let btn = $(e.target).off('click').removeClass('btn-default btn-info btn-warning btn-danger btn-secondary')

            let tmp = btn.attr("media-uuid")
            let media_uuid = tmp ? tmp : ""

            tmp = btn.attr("label-uuid")
            let label_uuid = tmp ? tmp : ""

            let url_summary = `${this.api_labelsys}/${media_uuid}/label/summary?do=reviewer`
            GetData(url_summary).then(data => {
                let resp = data as ServerResponse
                switch (resp.code) {
                    case 200:
                        //存在标注信息
                        let summary = resp.data as ServerLabelSummary

                        switch (summary.ReviewProgress) {
                            case "using":
                                btn.addClass("btn-info").text(summary.ReviewRealname)
                                break

                            case "submit":
                                btn.addClass("btn-warning").text(summary.ReviewRealname)
                                break

                            case "r_warning":
                                btn.addClass("btn-danger").text(summary.ReviewRealname)
                                break

                            case "r_confirm":
                                btn.addClass("btn-primary").text(summary.ReviewRealname)
                                break

                            case "":
                            case "free":
                            default:
                                btn.addClass("btn-default").text("未审阅");
                                break
                        }
                        break

                    case 30001:
                        //不存在标注信息
                        btn.attr('title', "未标注").addClass("btn-default").text("未标注")
                        return
                }
            })
        })
    }
}

