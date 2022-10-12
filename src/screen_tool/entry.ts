/*
 * Copyright (c) 2022
 * Author: LIU Xiangyu
 * File: pacs_us_tool.js
 * Date: 2022/09/07 15:32:07
 */


import {ShowHisResult} from "../common/search_his";
import {AnalysisURL, GetData, PostData, SideBarControl} from "../common/common";
import {WindowError, Window_message} from "../common/window_message";
import Swal from "sweetalert2"
import * as stream from "stream";

const ENABLE_MODIFY = true
const U = AnalysisURL(window.location.href)
const URLS = window.location.pathname.split("/")
const SUBMIT_LEVEL = URLS[URLS.length-1]
// const API_BASE_STUDIES = `/api/v1/studies/${STUDIES_ID}/`

var STUDIES_ID = "",SERIES_ID =""

URLS.forEach((v,k)=> {
    switch (v) {
        case "studies":
            STUDIES_ID = URLS[k + 1]
            break
        case "series":
            SERIES_ID = URLS[k + 1]
            break
    }
})


const API_BASE_SERIES = `/api/v1/studies/${STUDIES_ID}/series/${SERIES_ID}`


let btnValuesView = ["未标注", "无法识别","-", "4CV", "LVOT","RVOT","3V","3VT", "AA","VC","3D","-","AC","股骨","丘脑切面","大动脉短轴","-","参数页","无效切面"]
let btnValuesData = {
    "未标注": null,
    "无法识别": null,
    "-1": null,
    "4CV": null,
    "LVOT": "左室流出道",
    "RVOT": "右室流出道",
    "3V": null,
    "3VT": null,
    "AA": null,
    "VC": null,
    "3D": "STIC相关",
    "-2": 0,
    "AC": "腹部横切面",
    "股骨": null,
    "头围+双顶径": null,
    "大动脉短轴": null,
    "-3": null,
    "参数页": null,
}

let btnValuesDiagnose = ["未标注", "无法判断", "切面正常", "切面异常"]
let btnValuesInterfere = ["未标注", "无干扰",  "存在测量线"]
const ImgPerPage = 8

class ScreenPlot {
    patient_id;
    instance_ids: any;
    data_loaded: any;
    data:any;
    maxPage: number =0
    maxInstance: number=8;
    page = 0;
    pageLink: JQuery<HTMLElement>[] = [];

    refHead;
    refBody;
    refFoot;

    objPager: JQuery<HTMLElement>|undefined;

    pic_per_line = 4;
    nowRows = 0;
    refTrs: JQuery<HTMLElement>[] = [];
    refTdImg: JQuery<HTMLElement>[] = [];
    refTdAct: JQuery<HTMLElement>[] = [];
    btnsView = new Map<any, any>();
    btnsDiagnose = new Map<any, any>();
    btnsInterfere = new Map<any, any>();

    constructor(parent: any) {
        this.patient_id = U.params.get('patient_id')

        let btnArea = $('<ul id="btn_area" class="nav nav-pills ml-auto p-2">')

        let btnHis = $(`<li class="nav-item" style="margin-left:20px"><a class="nav-link active" >检索病历</a></li>`).click(() => {
            if (this.patient_id) {
                ShowHisResult(this.patient_id)
            } else {
                toastr.error("未找到病例ID")
            }
        })
        let btnMemo = $(`<li class="nav-item" style="margin-left:20px"><a class="nav-link active" >备注</a></li>`).click(() => {
            OpSeriesMemo()
        })
        btnArea.append(btnHis).append(btnMemo)
        if (SUBMIT_LEVEL === "review") {
            let btnApprove = $(`<li class="nav-item" style="margin-left:20px"><a class="nav-link bg-green" >审核通过</a></li>`).click(() => {
                comm.submitSeriesStatus("review_series_approve")
            })
            let btnReject = $(`<li class="nav-item" style="margin-left:20px"><a class="nav-link bg-warning" >审核拒绝</a></li>`).click(() => {
                comm.submitSeriesStatus("review_series_reject")
            })
            btnArea.append(btnReject).append(btnApprove)
        } else {
            let btnSubmit = $(`<li class="nav-item" style="margin-left: 20px"><a class="nav-link bg-green">提交审核</a></li>`).click(() => {
                comm.submitSeriesStatus("author_series_submit")
            })
            btnArea.append(btnSubmit)
        }


        this.refHead = $('<div id="container_head" class="card-header"/>').append($(`<div class="float-right"/>`).append(btnArea))
        this.refBody = $('<div id="container_body" class="table text-center" />').width("100%")
        this.refFoot = $(`<div id="container_foot" class="card-footer"/>`)

        let main = $('<div class="card card-primary card-outline"/>').append(this.refHead).append(this.refBody).append(this.refFoot)
        parent.append(main)
    }

    load() {
        let url = `${API_BASE_SERIES}/details?src=ui`
        GetData(url).then((resp) => {
            if (resp != undefined) {
                let result = resp as ServerResponse
                if (result.code === 200) {
                    this.data = result.data
                    this.maxInstance = this.data['instance_details'].length
                    this.maxPage = Math.ceil(this.maxInstance / ImgPerPage)
                    this.pagerInit(this.maxPage)
                    this.pageSelect(0)
                }
            }
        })
    }

    reload() {
        $.get(`${API_BASE_SERIES}/details?src=ui`, result => {
            if (result.code === 200) {
                this.data = result.data
            }
        })
    }

    pagerInit(maxPage: number) {
        let obj = $(`<div class="clearfix float-right"/>`)
        this.objPager = $(`<ul class = "pagination m-0"/>`)

        let pgLink = $(`<a class="page-link">«</a>`).click(() => {
            this.pagePrev()
        })
        let pgItem = $(`<li class="page-item"/>`).append(pgLink)
        this.objPager.append(pgItem)

        for (let i = 1; i <= maxPage; i++) {
            pgLink = $(`<a class="page-link"/>`).text(i).click(() => {
                this.pageSelect(i - 1)
            })
            pgItem = $(`<li class="page-item"/>`).append(pgLink)
            this.objPager.append(pgItem)
            this.pageLink.push(pgItem)
        }

        pgLink = $(`<a class="page-link">»</a>`).click(() => {
            this.pageNext()
        })
        pgItem = $(`<li class="page-item"/>`).append(pgLink)
        this.objPager.append(pgItem)

        obj.append(this.objPager)
        this.refFoot.append(obj)
    }

    pageNext() {
        if (this.page < this.maxPage - 1) {
            this.pageSelect(this.page + 1)
        }
    }

    pagePrev() {
        if (this.page > 0) {
            this.pageSelect(this.page - 1)
        }
    }

    pageSelect(page: number) {
        // console.log("page:",this.page,"->", page)
        let start = page * ImgPerPage
        let data = this.data['instance_details'].slice(start, start + ImgPerPage)

        this.pageLink[this.page].removeClass("active")
        this.pageLink[page].addClass("active")
        this.page = page

        this.figureClean()
        data.forEach((v: any, i: any) => {
            this.figurePlot(i, v['instance_id'], !!v['frames'], v)
        })
    }

    addRow(count: number) {
        let row = this.nowRows
        for (; row < this.nowRows + count; row++) {
            let rowObj1 = $('<div class="row" />').attr("id", `instance_${row}`)
            let rowObj2 = $('<div class="row" />').attr("id", `instance_${row}_act`).attr("style", "padding-top:5px;padding-bottom:3px")
            for (let col = 0; col < this.pic_per_line; col++) {
                let colObj1 = $('<div class="col-3"/>').attr("id", `instance_${row}_${col}`)
                let colObj2 = $('<div class="col-3"/>').attr("id", `instance_${row}_${col}`)
                rowObj1.append(colObj1);
                rowObj2.append(colObj2);
                this.refTdImg.push(colObj1);
                this.refTdAct.push(colObj2);
            }
            this.refTrs.push(rowObj1) // push img line
            this.refTrs.push(rowObj2) // puah act line
            this.refBody.append(rowObj1) // add img line
            this.refBody.append(rowObj2) // add act line
        }
        this.nowRows = row
    }

    figureClean() {
        this.nowRows = 0
        this.refTrs = []
        this.refTdImg = []
        this.refTdAct = []
        this.refBody.children().remove()
    }

    figurePlot(num: number, instance_id: string, isVideo: boolean, data:any) {
        // console.log("plot",num,instance_id,isVideo,data)
        // let imgUrl = `/api/v1/screen?action=getmedia&instance_id=${instance_id}&src=ui`

        // let imgUrl = `/api/v1/screen/studies/${this.studies_id}/series/${this.series_id}/instances/${instance_id}/media?src=ui`
        let imgUrl = `/api/v1/media/index/${instance_id}`
        let col = num % this.pic_per_line
        let row = Math.floor(num / this.pic_per_line)
        if (row >= this.nowRows) {
            this.addRow(row - this.nowRows + 1)
        }
        let objImg = this.refTdImg[num]
        let objBtn = this.refTdAct[num]

        let img = $(`<img/>`).attr("src", imgUrl + "/thumb").width("100%")
        if (isVideo) {
            img.click(() => {
                imgViewer.show(imgUrl + "/video", true, 800, 600)
            })
        } else {
            img.click(() => {
                imgViewer.show(imgUrl + "/image", false, 800, 600)
            })
        }
        objImg.append(img)
        let acts = this.action(instance_id, isVideo, data)
        objBtn.append(acts)
    }

    action(instance_id: string, isVideo: boolean, data: any) {
        let obj = $('<div class="row"/>')

        let btnV = this.createBtnActionView(instance_id, data['label_view'])
        let btn1 = $('<div class="col-4" />').append(btnV)
        let btnD = this.createBtnActionDiagnose(instance_id, data['label_diagnose'])
        let btn2 = $('<div class="col-4" />').append(btnD)
        let btnI = this.createBtnActionInterfere(instance_id, data['label_interfere'])
        let btn3 = $('<div class="col-4" />').append(btnI)
        if (isVideo) {
            btnV.children().addClass("bg-warning")
            btnI.children().addClass("bg-warning")
            btnD.children().addClass("bg-warning")
        }

        obj.append(btn1).append(btn2).append(btn3)
        this.btnsView.set(instance_id, btnV)
        this.btnsDiagnose.set(instance_id, btnD)
        this.btnsInterfere.set(instance_id, btnI)
        return obj
    }

    createBtnActionView(instance_id: string, value: string) {
        if (!value || value === "0") {
            value = btnValuesView[0]
        }

        let btnDisp = $('<button type="button" class="btn btn-sm btn-flat"/>').addClass(value !== btnValuesView[0] ? "btn-primary" : "btn-info").text(value)
        let btnDrop = $('<button type="button" class="btn btn-sm btn-info btn-flat dropdown-toggle dropdown-icon" data-toggle="dropdown"/>')
        let btnContext = $('<div class="dropdown-menu" role="menu"/>')
        btnValuesView.forEach((txt, index) => {
            if (txt === "-") {
                let obj = $('<div class="dropdown-divider"/>')
                btnContext.append(obj)
            } else {
                let obj = $('<a class="dropdown-item"/>').text(txt).click(() => {
                    comm.submitValue(instance_id, "view", index)
                    if (txt !== btnValuesView[0]) {
                        btnDisp.removeClass("btn-info").addClass("btn-primary").text(txt)
                    } else {
                        btnDisp.removeClass("btn-primary").addClass("btn-info").text(txt)
                    }
                })
                btnContext.append(obj)
            }
        })

        let group = $('<div class="btn-group"/>').append(btnDisp).append(btnDrop).append(btnContext)

        let title = $('<div/>').text("切面标识")
        return $('<div/>').css("font-size", "80%").append(title).append(group)
    }

    createBtnActionDiagnose(instance_id:string, value:string) {
        if (!value || value === "0") {
            value = btnValuesDiagnose[0]
        }

        let btnDisp = $('<button type="button" class="btn btn-sm btn-flat"/>').addClass(value !== btnValuesDiagnose[0] ? "btn-primary" : "btn-info").text(value)
        let btnDrop = $('<button type="button" class="btn btn-sm btn-info btn-flat dropdown-toggle dropdown-icon" data-toggle="dropdown"/>')
        let btnContext = $('<div class="dropdown-menu" role="menu"/>')
        btnValuesDiagnose.forEach((txt, index) => {
            let obj = $('<a class="dropdown-item"/>').text(txt).click(() => {
                comm.submitValue(instance_id, "diagnose", index)
                if (txt !== btnValuesDiagnose[0]) {
                    btnDisp.removeClass("btn-info").addClass("btn-primary").text(txt)
                } else {
                    btnDisp.removeClass("btn-primary").addClass("btn-info").text(txt)
                }
            })
            btnContext.append(obj)
        })

        let group = $('<div class="btn-group"/>').append(btnDisp).append(btnDrop).append(btnContext)

        let title = $('<div/>').text("诊断标识")
        return $('<div/>').css("font-size", "80%").append(title).append(group)
    }

    createBtnActionInterfere(instance_id:string, value:string) {
        if (!value || value === "0") {
            value = btnValuesInterfere[0]
        }

        let btnDisp = $('<button type="button" class="btn btn-sm btn-flat"/>').addClass(value !== btnValuesInterfere[0] ? "btn-primary" : "btn-info").text(value)
        let btnDrop = $('<button type="button" class="btn btn-sm btn-info btn-flat dropdown-toggle dropdown-icon" data-toggle="dropdown"/>')
        let btnContext = $('<div class="dropdown-menu" role="menu"/>')
        btnValuesInterfere.forEach((txt, index) => {
            let obj = $('<a class="dropdown-item"/>').text(txt).click((e) => {
                comm.submitValue(instance_id, "interfere", index)
                if (txt !== btnValuesInterfere[0]) {
                    btnDisp.removeClass("btn-info").addClass("btn-primary").text(txt)
                } else {
                    btnDisp.removeClass("btn-primary").addClass("btn-info").text(txt)
                }
            })
            btnContext.append(obj)
        })

        let group = $('<div class="btn-group"/>').append(btnDisp).append(btnDrop).append(btnContext)

        let title = $('<div/>').text("干扰项")
        return $('<div/>').css("font-size", "80%").append(title).append(group)
    }

    updateBtnAction(instance_id: string, selector: string, value: number) {
        console.warn("btn_update", instance_id, selector, value)
        let obj = {};
        switch (selector) {
            case "view":
                obj = this.btnsView.get(instance_id)
                break
            case "diagnose":
                obj = this.btnsDiagnose.get(instance_id)
                break
            case "interfere":
                obj = this.btnsInterfere.get(instance_id)
                break
            default:
                alert("E1")
        }
        if (!!obj) {
            console.log(obj)
        }
    }
}

class ImageViewer {
    objViewer;
    objTitle;
    objImage;
    objVideo;

    constructor() {
        let objTitleTxt = $(`<h4 class="modal-title" />`).text("影像预览")
        let objTitleBtn = $('<button type="button" class="close">').text("×").click(() => {
            this.hide()
        })
        let objTitle = $('<div class="modal-header"/>').append(objTitleTxt).append(objTitleBtn)

        let objImage = $('<img/>').width(800).attr("src", "")
        let objVideo =  $('<video controls autoplay loop muted preload="auto"/>').width(800).attr("src", "")
        let objBodyContent = $('<div class="text-center"/>').append(objImage).append(objVideo)
        let objBody = $('<div class="modal-body"/>').append(objBodyContent).click(() => {
            this.hide()
        })

        let obj1 = $('<div class="modal-content bg-primary"/>').append(objTitle).append(objBody);
        let obj2 = $('<div class="modal-dialog modal-lg" style="max-width: 1000px"/>').append(obj1);
        let obj = $('<div class="modal fade" />').hide().append(obj2)

        this.objViewer = obj
        this.objTitle = objTitleTxt
        this.objImage = objImage
        this.objVideo = objVideo

        $('.wrapper').append(obj)
    }

    show(url:string, isVideo:boolean, width:number, height:number) {
        if (isVideo) {
            this.objVideo.attr("src", url).width(800).show()
            this.objImage.hide()
        } else {
            this.objImage.attr("src", url).width(800).show()
            this.objVideo.hide()
        }
        this.objViewer.addClass("show").show()
    }



    hide() {
        this.objViewer.attr("src","")
        this.objImage.attr("src", "")
        this.objViewer.removeClass("show").hide()
    }
}

class Communicator {
    studies_id;
    series_id;
    disable;

    constructor() {
        this.series_id = SERIES_ID
        this.studies_id = STUDIES_ID
        this.disable = !ENABLE_MODIFY
    }

    submitValue(instance_id:string, selector:string, value:number) {
        if (this.disable) {
            WindowError("只读模式", 2000)
            return
        }

        let info:any = {}
        info['selector'] = selector

        switch (selector) {
            case "view":
                info['value'] = btnValuesView[value]
                break
            case "diagnose":
                info['value'] = btnValuesDiagnose[value]
                break
            case "interfere":
                info['value'] = btnValuesInterfere[value]
                break
            default:
                alert("无效选择器" + selector + value)
                return
        }

        let data = {
            "operate": "instance_set",
            "studies_id": STUDIES_ID,
            "series_id": SERIES_ID,
            "instance_id": instance_id,
            "submit_level": SUBMIT_LEVEL,
            "info": info
        }

        let url = `${API_BASE_SERIES}/screen_submit`
        PostData(url, data).then((resp) => {
            let data = resp as ServerResponse

            if (data.code !== 200) {
                // sp.updateBtnAction(instance_id, selector, resp.data)
                // sp.reload()
                WindowError(data.msg, 2000)
            }
        })
    }

    submitSeriesStatus(submit_status:string) {
        if (!ENABLE_MODIFY) {
            WindowError("只读模式", 2000)
            return
        }

        let data = {
            "operate": submit_status,
            "studies_id": STUDIES_ID,
            "series_id": SERIES_ID,
        }

        $.post(`${API_BASE_SERIES}/screen_submit`, JSON.stringify(data), response => {
            if (response.code === 200) {
                Window_message("完成提交", "", 1000, () => {
                    window.close()
                })
            } else {
                WindowError("提交失败，请重试", 2000)
            }
        })
    }
}


function OpSeriesMemo() {
    const u = `${API_BASE_SERIES}/memo`
    $.get(u, (resp) => {
        if (resp.code === 200) {
            let memoText = resp.data
            Swal.fire({
                title: "备注",
                input: 'textarea',
                inputValue: memoText,
                showCancelButton: true,
                confirmButtonText: '提交',
                cancelButtonText: '取消',
                showLoaderOnConfirm: true,
                preConfirm: (memoNew) => {
                    let data = {}
                    const senddata: SendData = {media: "", data: memoNew, direction: 'upload', admin: ''}
                    PostData(u,senddata)
                        .then((response:any) => {
                            if (!response.ok) {
                                throw new Error(response.statusText)
                            }
                            return response.json()
                        }) // parses response to JSON
                        .catch(error => {
                            Swal.showValidationMessage(
                                `反馈错误: ${error}`
                            )
                        })
                },
                allowOutsideClick: () => !Swal.isLoading(),
                backdrop: true,
            }).then((result:any) => {
                if (!result.isConfirmed) {
                    return
                }

                if (result.value.code === 200) {
                    Window_message("", "提交完成", 2000,undefined)
                }
            })
        } else {
            WindowError("memo error",0)
        }
    })
}

// hide user bar
SideBarControl("hide")
let comm = new Communicator()
let imgViewer = new ImageViewer()
let sp = new ScreenPlot($("#main-content"))
sp.load()