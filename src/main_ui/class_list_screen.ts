import $ from "jquery"
import {GetData, BuildURL} from "../common/common";
import Swal from "sweetalert2"
import * as events from "events";
import {class_table_object} from "./class_table"


export class class_list_screen {
    root_api = "/api/v1"
    ref_main: JQuery
    lastPageIndex = 1;
    cardContainer: JQuery | undefined;
    cardHead: JQuery | undefined;
    cardBody: JQuery | undefined;
    cardFoot: JQuery | undefined;

    obj_table: class_table_object | undefined

    data_groups: ServerGroupData[] = [];

    constructor(id: JQuery, root_api: string) {
        this.ref_main = id
        if (root_api != "") {
            this.root_api = root_api
        }
    }

    Start() {
        let url = `${this.root_api}/group?action=getlistfull&type=screen`

        GetData(url).then((data)=>{
            if (!data) {
                alert("Server failed")
                return
            }

            let resp = data as ServerResponse
            if (resp.code == 200 && resp.data.length > 0) {
                this.data_groups = resp.data as ServerGroupData[]
                this.cardHead = $(`<div class="card-header d-flex p-0"><h3 class="card-title p-3">媒体列表</h3><ul id="group_ids" class="nav nav-pills ml-auto p-2" /></div>`);
                this.cardContainer = $('<div class="card" />').append(this.cardHead)
                this.ref_main.append(this.cardContainer)

                this.CreateCardHeadGroupButton();
                this.LoadUserLastStatus();
            }
        })
    }

    async LoadUserLastStatus() {
        let url = `${this.root_api}/user?action=laststatus&grouptype=screen`

        let resp = await GetData(url) as ServerResponse
        if (resp.code == 200) {
            let data = JSON.parse(resp.data);
            let gid = data['lastGroupId']
            let lastPage = data['lastPageIndex']
            if (!(gid in this.data_groups)) {
                gid = this.data_groups[0]['Gid']
                lastPage = 1
            }

            $(`#groupid_${gid}`).addClass("active");
            this.CreateCardBody(gid, lastPage);
        }
    }

    CreateCardHeadGroupButton() {
        this.data_groups.forEach((v) => {
            let gid = v.Gid
            let gname = (v.Name == "") ? `G_${gid}` : v.Name

            let obj = $(`<li class="nav-item"><a id="groupid_${gid}" class="nav-link" href="#" data-toggle="tab">${gname}</a></li>`).on("click", () => {
                this.CreateCardBody(gid, 1);
            });
            $("#group_ids").append(obj)
        });
    }

    CreateCardBody(gid: string, show_page: number) {
        if (!this.cardBody) {
            this.cardBody = $("<div class='card-body p-0'/>");
            this.cardContainer?.append(this.cardBody);
        }

        if (!this.obj_table) {
            let fields:jqGridField[] = []
            fields.push({label: "PatientID", name: "patient_id", width: 80,hidden: false, summaryType: '',formatter:undefined})
            fields.push({label: "SeriesID", name: "series_id", width: 100,hidden: false, summaryType: '',formatter:undefined})
            fields.push({label: "StudiesID", name: "studies_id", width: 100,hidden: true, summaryType: 'sum',formatter:undefined})
            fields.push({label: "实例数", name: "instance_count", width: 80,hidden: false, summaryType: '',formatter:undefined})
            fields.push({label: "检查时间", name: "studies_datetime", width: 80,hidden: false, summaryType: '',formatter:undefined})
            fields.push({label: "上传时间", name: "record_datetime", width: 80,hidden: false, summaryType: '',formatter:undefined})
            fields.push({label: "进度", name: "progress", width: 80,hidden: false, summaryType: '',formatter:undefined})
            fields.push({label: "标注", name: "author", width: 80,hidden: false, summaryType: '',formatter:undefined})
            fields.push({label: "审阅", name: "reviewer", width: 80,hidden: false, summaryType: '',formatter:undefined})
            fields.push({label: "备注", name: "memo", width: 80,hidden: false, summaryType: '',formatter:undefined})
            fields.push({label: "操作", name: "oprRender", width: 80,hidden: false, summaryType: '',formatter: this.oprRender})

            this.obj_table = new class_table_object(this.cardBody, `${this.root_api}/screen_list`,fields,["patient_id"])
            this.OpBindOnButtons(this.cardBody)
        }

        // this.obj_table.load(gid, show_page, -1, -1)
    }


    oprRender(data: any, options: any, row: any) {
        let op = (row['progress'] === '审核完成') ? "view" : "author"

        let obj = $('<div class="row custom-operate" />')
            .attr("studies_id", row.studies_id)
            .attr("series_id", row.series_id)
            .attr("patient_id", row.patient_id)

        let ref_btn1 = $(`<div class='btn btn-info btn-xs custom-btn-search-his' style="margin-right: 5px">报告</div>`)
        // this.OpSearchHis(row.patient_id)
        let ref_btn2 = $(`<div class='btn btn-primary btn-xs custom-btn-open-screen-tool' style="margin-right: 5px"'>挑图</div>`)
        // this.OpScreenTool(row.studies_id, row.series_id, row.patient_id, op)

        obj.append(ref_btn1).append(ref_btn2)

        if ((row['progress'] === '待审核' || row['progress'] === '待重审')) {
            let ref_btn3 = $(`<div class='btn btn-dark btn-xs custom-btn-open-screen-tool-review' style="margin-right: 5px">审核</div>`)
            // this.OpScreenTool(row.studies_id, row.series_id, row.patient_id, "review")
            obj.append(ref_btn3)
        }


        let ref_btn4 = $(`<div class='btn btn-danger btn-xs custom-btn-open-admin' style="margin-right: 5px">管理</div>`)
        obj.append(ref_btn4)

        return obj.prop("outerHTML")
    }

    async OpAdmin(studiesId: string, seriesId: string, patientId: string) {
        const inputOptions = new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    'adminRemoveLabel': '清除挑图数据',
                    'adminHide': '隐藏',
                    'adminDelete': '删除',
                    '': '取消'
                })
            }, 0)
        })

        const {value: opAdmin} = await Swal.fire({
            icon: 'question',
            title: '数据管理',
            html: `<table class="table table-bordered"><tr><td>Patient Id</td><td>${patientId}</td></tr><tr><td>Studies Id</td><td>${studiesId}</td></tr><tr><td>Series Id</td><td>${seriesId}</td></tr></table>`,
            input: 'radio',
            width: '600px',
            inputOptions: inputOptions,
        })

        if (!opAdmin) {
            return
        }

        const retData = await Swal.fire({
            icon: 'warning',
            html: `请输入管理密码用于:<br>${opAdmin}`,
            input: 'text',
            inputAttributes: {
                autocapitalize: 'off'
            },
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: '确认',
            cancelButtonText: '取消',
        })

        if (!retData.isConfirmed) {
            return
        }

        let pwd = (retData.value) ? retData.value : ""
        switch (opAdmin) {
            case "adminHide":
                this.OpHideStudies(studiesId, seriesId, pwd)
                break

            case "adminDelete":
                this.OpDeleteSeries(studiesId, seriesId, pwd)
                break

            case "adminRemoveLabel":
                this.OpDeleteSeriesScreen(studiesId, seriesId, pwd)
                break
        }
    }

    OpScreenTool(studiesId: string, seriesId: string, patientId: string, submit_level: string) {
        let u = `/api/v1/studies/${studiesId}/series/${seriesId}/screen_getlock`
        $.get(u, result => {
            // console.log(result)
            if (result.code === 200) {
                let targetURL = `/ui/screen/studies/${studiesId}/series/${seriesId}/${submit_level}?patient_id=${patientId}`
                window.open(targetURL, "", 'fullscreen, toolbar=no, menubar=no, scrollbars=no, resizable=no,location=no, status=no')
            } else {
                console.log(result)
                alert("其它用户正在标注本视频，请等待或选择其它数据处理。")
            }
        })
    }

    OpHideStudies(studiesId: string, seriesId: string, pwd: string) {
        let u = `/api/v1/studies/${studiesId}/hidden`
        let data: SendData = {
            admin: pwd,
            data: true,
            direction: "upload",
            media: ""
        }

        $.post(u, JSON.stringify(data), result => {
            if (result.code === 200) {
                console.log('完成', '本关联实例已隐藏.', 1000)
                this.obj_table?.reload()
            } else {
                alert(result.msg)
            }
        });
    }

    OpDeleteSeriesScreen(studiesId: string, seriesId: string, pwd: string) {
        let u = `/api/v1/studies/${studiesId}/series/${seriesId}/screen`
        $.ajax({
            url: u,
            type: "delete",
            contentType: "application/json",
            dataType: "json",
            data: JSON.stringify({"admin": pwd}),
            success: (resp: ServerResponse) => {
                if (resp.code !== 200) {
                    alert(resp.msg)
                } else {
                    alert('已清除！' + '标注与人员的关联信息已清除.')
                    this.obj_table?.reload()
                }
            },
        });
    }

    OpDeleteSeries(studiesId: string, seriesId: string, pwd: string) {
        let u = `/api/v1/studies/${studiesId}/series/${seriesId}/raw`
        $.ajax({
            url: u,
            type: "delete",
            contentType: "application/json",
            dataType: "json",
            data: JSON.stringify({"admin": pwd}),
            success: (resp: ServerResponse) => {
                if (resp.code !== 200) {
                    Swal.fire(resp.msg)
                } else {
                    Swal.fire('完成', '本实例已删除.')
                    this.obj_table?.reload()
                }
            },
        });
    }

    OpSearchHis(patientId:string) {
        let u = `/api/v1/his/${patientId}`
        $.get(u, result => {
            console.log(result)
            if (result.code === 200) {
                let disp = ""
                if (result.data.length === 0) {
                    Swal.fire(`未检索到关于病例号< ${patientId} >的诊断信息。`)
                } else {
                    // windowResult("查询结果", hisResultAnalysis(result.data), 20000)
                }
            } else {
                Swal.fire(result.msg)
            }
        })
    }

    OpBindOnButtons(parent:JQuery) {
        parent.on("click", ".custom-btn-open-admin", (e: any) => {
            let p = $(e.target).parent()
            let studies_id = p.attr("studies_id")
            let series_id = p.attr("series_id")
            let patient_id = p.attr("patient_id")

            if (studies_id && series_id && patient_id) {
                this.OpAdmin(studies_id, series_id, patient_id)
            }
        })

        //custom-btn-open-screen-tool
        parent.on("click", ".custom-btn-open-screen-tool", (e: any) => {
            let p = $(e.target).parent()
            let studies_id = p.attr("studies_id")
            let series_id = p.attr("series_id")
            let patient_id = p.attr("patient_id")

            if (studies_id && series_id && patient_id) {
                this.OpScreenTool(studies_id, series_id, patient_id, "author")
            }
        })

        //custom-btn-open-screen-tool
        parent.on("click", ".custom-btn-open-screen-tool-review", (e: any) => {
            let p = $(e.target).parent()
            let studies_id = p.attr("studies_id")
            let series_id = p.attr("series_id")
            let patient_id = p.attr("patient_id")

            if (studies_id && series_id && patient_id) {
                this.OpScreenTool(studies_id, series_id, patient_id, "review")
            }
        })
        //custom-btn-open-screen-tool
       parent.on("click", ".custom-btn-search-his", (e: any) => {
            let p = $(e.target).parent()
            let studies_id = p.attr("studies_id")
            let series_id = p.attr("series_id")
            let patient_id = p.attr("patient_id")

            if (studies_id && series_id && patient_id) {
                this.OpScreenTool(studies_id, series_id, patient_id, "review")
            }
        })
    }
}
