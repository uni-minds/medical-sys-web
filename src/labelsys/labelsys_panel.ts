import {LabelData} from "./labelsys_data";
import {Button, CanvasButtonGroup} from "./labelsys_buttons";
import {UI} from "./labelsys_ui";
import {MainPanel} from "./entry";
import {PostData} from "../common/common";
import {CanvasContainer} from "./labelsys_container";
import toastr = require("toastr");



/**
 * 面板父类
 */
export class BasicPanel {
    ref_main: JQuery
    ref_ui: UI
    ref_main_panel: MainPanel
    usr_label_data: LabelData

    constructor(ref_main: JQuery, main_panel: MainPanel, label_data: LabelData, ui: UI) {
        this.ref_main = ref_main
        this.ref_ui = ui
        this.usr_label_data = label_data
        this.ref_main_panel = main_panel
    }
}

/**
 * 标注功能面板，左侧
 */
export class CanvasPanel extends BasicPanel {
    data_btn_status: Map<string, string>
    data_groups: Map<string, CanvasButtonGroup>

    ref_canvas_container: CanvasContainer | undefined

    // private data_current_page: number = 0
    private data_page_template = new Map<string, string>()

    constructor(ref_main: JQuery, main_panel: MainPanel, label_data: LabelData, ui: UI) {
        super(ref_main, main_panel, label_data, ui)
        this.ref_main_panel = main_panel
        this.data_groups = new Map
        this.data_btn_status = new Map<string, string>
    }

    set_canvas_ref(ref: CanvasContainer) {
        this.ref_canvas_container = ref
    }

    load_crf(crf_groups: Map<string, crf_meta>) {
        // 标签信息
        crf_groups.forEach((group) => {
            let color: string

            switch (group.name) {
                case "通用标签":
                    color = "yellow"
                    break
                case "异常标签":
                    color = "red"
                    break
                default:
                    color = "default"
                    break
            }

            let obj = new CanvasButtonGroup(this, group.name, group.gopen, color, undefined, (id: string) => {
                this.on_l_click(id)
            }, (id: string) => {
                this.on_r_click(id)
            })

            obj.add_buttons(this.usr_label_data.crfGroup(group.group));
            this.data_groups.set(group.group, obj)
        })
    }

    on_l_click(btnId: string) {

        // console.debug("canvas_panel_on_l", this.id, this)
        // const frame = this.get_current_page()
        const stor = this.usr_label_data

        let crf = stor.get_crf_data(btnId)
        if (!crf) {
            toastr.error("cannot find crf meta:" + btnId)
            return
        }

        let group = stor.get_group_data(crf.group)
        if (!group) {
            toastr.error("cannot find crf group:" + crf.group)
            return
        }
        // console.debug("btnCrf:", crf, "btnGroup", group)
        let gid = crf.group

        let vOld = this.get_value(gid)
        let vNew = btnId

        console.debug("L_Click:", btnId, "Value:", vOld, "->", vNew)

        if (group.gradio) {
            let custom = (crf.value == "INPUT")
            if (custom) {
                let tmp = this.ref_ui.prompt("请输入状态", (vOld) ? vOld : vNew)
                if (tmp == null) {
                    return
                } else {
                    vNew = tmp
                }
            }

            if (vOld) {
                if (vNew && vNew !== vOld && this.ref_ui.confirm("确认调整")) {
                    this.set_button(this.usr_label_data.get_crf_data(vOld) ? vOld : "SPEC", "off", undefined)
                    this.set_button(btnId, "on", (custom) ? vNew : undefined)
                    this.set_value(gid, vNew, crf)
                }
            } else {
                this.set_button(btnId, "on", (custom) ? vNew : undefined)
                this.set_value(gid, vNew, crf)
            }

        } else {
            const cc = this.ref_canvas_container

            if (cc && !cc.get_page_time_label()) {
                toastr.error("请先进行时间标注")
                return
            }

            if (vOld) {
                cc?.deactivate(vOld)
                this.set_button(vOld, (cc?.has_part(vOld)) ? "on" : "off", undefined)

                if (vOld == vNew) {
                    cc?.del_part(gid)
                    return
                }
            }
            this.set_button(btnId, "hold", undefined)
            cc?.activate(btnId, crf.type, crf.color)
            this.set_value(gid, btnId, crf)
        }
    }

    on_r_click(btnId: string) {
        console.log("R_Click:", btnId)
    }

    page_load(frame: number) {
        this.page_clear()
        let d = this.usr_label_data.get_page(frame)
        console.info("page data:", d)
        if (d) {
            if (d.clabels) {
                d.clabels.forEach((a, id) => {
                    this.set_button(id, "on", undefined)
                    this.data_page_template.set(id, "on")
                })
            }

            if (d.cid) {
                this.data_page_template.set("t", d.cid)
                if (d.cid === "SPEC") {
                    this.set_button(d.cid, "on", d.cdescribe)
                } else {
                    this.set_button(d.cid, "on", undefined)
                }
            }
        }
    }

    private page_clear() {
        // console.debug("page_clear.button status", this.data_btn_status)
        this.data_btn_status.forEach((v, id) => {
            // console.log("check:", id, v)
            switch (v) {
                case "on":
                case "hold":
                    let crf = this.usr_label_data.get_crf_data(id)
                    if (crf && crf.domain != "global") {
                        // console.info(`clear: ${id}`, crf)
                        this.set_button(id, "off", undefined)
                    } else {
                        console.debug("ignore global:", id)
                    }
            }
        })
        this.data_page_template = new Map<string, any>()
    }

    // set_current_page(frame: number): boolean {
    //     if (frame < 0) {
    //         return false
    //     }
    //
    //     this.data_current_page = frame
    //     return this.page_load(this.data_current_page)
    // }

    // get_current_page(): number {
    //     return this.data_current_page
    // }

    set_button(id: string, status: string, text: string | undefined) {
        // console.log(`cp set button id-> ${id} status-> ${status}`)
        if (!id) {
            toastr.error("未知按钮")
            return
        }
        let crf = this.usr_label_data.get_crf_data(id)
        if (!crf) {
            toastr.error("未知CRF:" + id)
            return
        }
        let target = this.data_groups.get(crf.group)
        switch (status) {
            case "hold":
                target?.hold(id)
                this.data_btn_status.set(id, status)
                break

            case "off":
                target?.off(id)
                target?.text(id, crf.name)
                this.data_btn_status.delete(id)
                break

            case "on":
                target?.on(id)
                this.data_btn_status.set(id, status)
                if (text != undefined) {
                    target?.text(id, text)
                }
                break
            default:
                toastr.error("按钮状态异常：" + status)
        }
    }

    set_value(id: string, value_new: string, crf: crf_meta) {
        console.log("canvas_panel_set_value:", id, value_new, crf)
        const cc = this.ref_canvas_container
        if (cc) {
            this.data_page_template.set(id, value_new)
            switch (id) {
                case "t":
                    const media_current = this.ref_main_panel.get_current_play_info()
                    cc.set_page_time_label(crf.id, value_new, media_current.time)
                    break
                case "q":
                    this.usr_label_data.set_global(crf.group, parseInt(crf.value))
                    break


            }
        }
    }

    get_value(id: string) {
        return this.data_page_template.get(id)
    }
}

/**
 * 系统面板，右侧隐藏
 */
export class SystemPanel extends BasicPanel {
    memo: CanvasButtonGroup
    system: SystemButtonGroup
    admin: AdminButtonGroup

    constructor(ref_main: JQuery,main_panel: MainPanel, label_data: LabelData, ui: UI,  api_root: string) {
        super(ref_main,main_panel, label_data, ui)
        // let ul = $('<ul class="nav nav-pills nav-sidebar flex-column nav-flat" data-widget="treeview" role="menu" data-accordion="false"/>')
        // let nav = $('<nav class="mt-0" />').append(ul)
        // this.ref_main_list = ul
        // this.obj_main.addClass("sidebar").append(nav)
        // 用户备注
        this.memo = new CanvasButtonGroup(this, "备注内容", true, undefined, undefined, undefined, undefined)
        this.memo.add_input("memo", 5, "输入备注信息……", "保存备注", api_root + '/label/memo');
        this.system = new SystemButtonGroup(this, "系统工具", true, ui, label_data, api_root)
        this.admin = new AdminButtonGroup(this, "管理工具", true, ui, label_data, api_root)
    }

    exit() {
        this.ref_main_panel.exit()
    }
}


/**
 * 系统按钮组
 */
class SystemButtonGroup extends CanvasButtonGroup {
    constructor(parent:SystemPanel, title:string, open:boolean,ui:UI,label_stor:LabelData,api_root:string) {
        super(parent, title, open, undefined, undefined, undefined, undefined);
        let senddata: SendData = {media: label_stor.data_media_uuid, direction: "upload", admin: "", data: null}
        switch (label_stor.data_submit_level) {
            case "author":
                let btn = new Button("usr-submit", "提交审核", 12, "#67afe5",  0, () => {
                    label_stor.post_author_submit().then((resp) => {
                        if (resp.code == 200) {
                            toastr.success("已提交审核")
                            if (resp.data == "exit") {
                                parent.exit()
                            }
                        } else {
                            toastr.error(resp.msg, resp.code.toString())
                        }
                    })
                }, undefined)
                btn.set_color_default()
                this.ref_main.append(btn.get_object())
                break

            case "review":
                let btnReject = new Button("usr-reject", "驳回", 6, "#cc6666",  0, () => {
                    if (ui.confirm("确认驳回？")) {
                        label_stor.post_reviewer_reject().then((resp) => {
                            if (resp.code === 200 ) {
                                toastr.success("如需要，请在备注中注明驳回原因","已驳回")
                                if (resp.data === "exit") {
                                    parent.exit()
                                }
                            } else {
                                toastr.error(resp.msg, resp.code.toString())
                            }
                        })
                    }
                }, undefined)
                let btnConfirm = new Button("usr-confirm", "通过", 6, "#99ffcc",  0, () => {
                    label_stor.post_reviewer_confirm().then((resp) => {
                        if (resp.code === 200) {
                            toastr.success("已提交审核通过")
                            if (resp.data === "exit") {
                                parent.exit()
                            }
                        } else {
                            toastr.error(resp.msg, resp.code.toString())
                        }
                    })
                }, undefined)
                btnReject.set_color_default()
                btnConfirm.set_color_default()

                this.ref_main.append(btnConfirm.get_object()).append(btnReject.get_object())
                break
        }
    }
}


/**
 * 管理员按钮组
 */
class AdminButtonGroup extends CanvasButtonGroup {
    constructor(parent: SystemPanel, title: string, open: boolean, ui: UI, label_stor: LabelData, api_root: string) {
        super(parent, title, open, undefined, undefined, undefined, undefined);
        let obj = new Button("usr-drop", "清空全部标注", 12, "#dc3545", 0, () => {
            if (ui.confirm("警告！确认后将清空本媒体对应的全部标注数据")) {
                toastr.error("未授权操作")
            }
        }, undefined)
        obj.set_color_default()
        this.ref_main.append(obj.get_object())

        obj = new Button("usr-export", "导出标注", 6, "", 0, () => {
            ui.prompt("标注内容", label_stor.get_usr_data())
        }, undefined)
        this.ref_main.append(obj.get_object())

        obj = new Button("usr-import", "导入标注", 6, "", 0, () => {
            let data = ui.prompt("数据内容", label_stor.get_usr_data())
            if (data) {
                label_stor.set_usr_data(data)
                label_stor.upload().then((resp) => {
                    if (resp.code == 200) {
                        toastr.success("完成")
                    } else {
                        toastr.error(resp.msg, resp.code.toString())
                    }
                })
            } else {
                toastr.warning("导入已取消")
            }
        }, undefined)
        this.ref_main.append(obj.get_object())

        obj = new Button("usr-release", "至无标注状态", 6, "", 6, () => {
            let data = ui.prompt("需要管理员提权，删除后本窗口将关闭", undefined)
            if (data) {
                $.ajax({
                    url: api_root + '/label/full',
                    type: 'DELETE',
                    data: JSON.stringify({"admin": data}),
                }).done(resp => {
                    if (resp.code == 200) {
                        toastr.success("操作完成")
                        switch (resp.data) {
                            case "exit":
                                parent.exit()
                                break

                            case "":
                                break

                            default:
                                toastr.info(resp.data)
                        }
                    } else {
                        toastr.error(resp.msg, resp.code)
                    }
                })
            }
        }, undefined)
        this.ref_main.append(obj.get_object())

        obj = new Button("revoke", "至无审阅状态", 6, "", 6, () => {
            let data = ui.prompt("调整审阅状态需要管理员提权", undefined)
            if (data) {
                const senddata: SendData = {admin: data, direction: "upload", media: "", data: label_stor.data_label_uuid}
                // console.log("senddata", senddata)
                // /api/v1/media/MEDIA/label/:op
                const url = api_root + '/label/review?do=revoke'
                PostData(url, senddata).then((data) => {
                    if (data == undefined) {
                        return undefined
                    }
                    let resp = data as ServerResponse
                    if (resp.code == 200) {
                        toastr.success("操作完成")
                        switch (resp.data) {
                            case "exit":
                                parent.exit()
                                break

                            case "":
                                break

                            default:
                                toastr.info(resp.data)

                        }
                    } else {
                        toastr.error(resp.msg, resp.data)
                    }
                })
            }
        }, undefined)
        this.ref_main.append(obj.get_object())
    }
}
