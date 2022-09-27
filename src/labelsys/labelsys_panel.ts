import $ from "jquery";
import {LabelData} from "./labelsys_data";
import {ButtonGroup} from "./labelsys_buttons";
import {UI} from "./labelsys_ui";
import {CanvasContainer, MainPanel} from "./entry";


/**
 * 面板父类
 */
export class BasicPanel {
    obj_main: JQuery

    ref_main_list: JQuery | undefined
    ref_ui: UI

    id:string

    usr_label_data: LabelData

    constructor(parent: JQuery, id: string, label_data: LabelData, ui: UI) {
        this.obj_main = $(`<div id="${id}"/>`)
        this.id=id
        this.ref_ui = ui
        this.usr_label_data = label_data
        parent.append(this.obj_main)
    }
}

/**
 * 标注功能面板，左侧
 */
export class CanvasPanel extends BasicPanel {
    data_btn_status: Map<string, any>
    data_groups: Map<string, any>
    ref_canvas_container: CanvasContainer|undefined
    ref_main_panel: MainPanel
    private data_current_page: number = 0

    data = new Map<string,string>()

    constructor(parent: JQuery, id: string, label_data: LabelData, ui: UI, main_panel: MainPanel) {
        super(parent, id, label_data, ui)
        // this.ref_canvas_container = canvas_container
        this.data_groups = new Map
        this.ref_main_panel = main_panel
        let ul = $('<ul class="nav nav-pills nav-sidebar flex-column nav-flat" data-widget="treeview" role="menu" data-accordion="false"/>')
        let nav = $('<nav class="mt-1" />')
        nav.append(ul)
        this.ref_main_list = ul
        this.obj_main.addClass("sidebar").append(nav)
        this.data_btn_status = new Map

    }

    set_canvas_ref(ref: CanvasContainer) {
        this.ref_canvas_container = ref
    }

    load_crf() {
        // 标签信息
        let crf_groups = this.usr_label_data.get_crf_groups()
        crf_groups.forEach((g: crf_meta) => {
            let color: string

            // console.log("lbl_meta", g)
            switch (g.name) {
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
            let obj = new ButtonGroup(this, g.name, true, color, null, (id: string) => {
                this.on_l_click(id)
            }, (id: string) => {
                this.on_r_click(id)
            }, this.ref_ui)


            // let obj = new ButtonGroup(this, g.name, g.gopen, color, null, this.on_l_click, (id: string) => {
            //     console.log("r_click:", id, this.get_current_page())
            // },this.ref_ui)


            obj.addButtons(this.usr_label_data.crfGroup(g.group));
            this.data_groups.set(g.group, obj)
        })
        this.set_current_page(0)
    }

    on_l_click(btnId: string) {
        console.groupCollapsed("L_Click:", btnId)

        // console.debug("canvas_panel_on_l", this.id, this)
        // const frame = this.get_current_page()
        const stor = this.usr_label_data

        let crf = stor.get_crf_data(btnId)
        if (!crf) {
            console.error("cannot find crf.", btnId)
            return
        }

        let group = stor.get_group_data(crf.group)
        if (!group) {
            console.error("cannot find group:", crf.group)
            return
        }

        console.debug("btnCrf:", crf, "btnGroup", group)

        let gid = crf.group

        let vOld = this.get_value(gid)
        let vNew = btnId

        console.log("Value:", vOld, "->", vNew)

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
                    this.set_button(this.usr_label_data.get_crf_data(vOld) ? vOld : "SPEC", "off", null)
                    this.set_button(btnId, "on", (custom) ? vNew : "")
                    this.set_value(gid, vNew, crf)
                }
            } else {
                this.set_button(btnId, "on", (custom) ? vNew : "")
                this.set_value(gid, vNew, crf)
            }

        } else {
            const cc = this.ref_canvas_container

            if (cc && !cc.get_page_time_label()) {
                this.ref_ui.alert("请先进行时间标注")
                return
            }

            if (vOld) {
                cc?.deactivate(vOld)
                this.set_button(vOld, (cc?.has_part(vOld)) ? "on" : "off", null)

                if (vOld == vNew) {
                    cc?.del_part(gid)
                    return
                }
            }
            this.set_button(btnId, "hold", null)
            cc?.activate(btnId, crf.type, crf.color)
            this.set_value(gid, btnId, crf)
        }
        console.groupEnd()
    }

    on_r_click(btnId:string){
        console.groupCollapsed("R_Click:",btnId)
        console.groupEnd()
    }

    private page_load(frame: number): boolean {
        this.page_clear()
        let d = this.usr_label_data.get_page(frame)
        // console.info("page data:", d)
        if (d && d.clabels) {

            for (const id in d.clabels) {
                console.log("set button", id)
                this.set_button(id, "on", "")
            }

            if (d.cid === "SPEC") {
                console.log("set button", d.cid, d.cdescribe)
                this.set_button(d.cid, "on", d.cdescribe)

            } else {
                console.log("set button", d.cid)
                this.set_button(d.cid, "on", "")

            }

            return true
        }
        return false
    }

    private page_clear() {
        console.groupCollapsed("page clear: button status",this.data_btn_status)
        this.data_btn_status.forEach((v, id) => {
            // console.log("check:", id, v)
            switch (v) {
                case "on":
                case "hold":
                    let crf = this.usr_label_data.get_crf_data(id)
                    if (crf && crf.domain != "global") {
                        // console.info(`clear: ${id}`, crf)
                        this.set_button(id, "off", null)
                    } else {
                        console.log("ignore global:", id)
                    }
            }
        })
        this.data=new Map<string,any>()
        console.groupEnd()
    }

    set_current_page(frame: number): boolean {
        if (frame < 0) {
            return false
        }

        this.data_current_page = frame
        return this.page_load(this.data_current_page)
    }

    get_current_page(): number {
        return this.data_current_page
    }

    set_button(id: string, status: string, text: string | null) {
        console.log(`cp set button id-> ${id} status-> ${status}`)
        if (!id) {
            return
        }
        let crf = this.usr_label_data.get_crf_data(id)
        if (!crf) {
            return
        }
        let target = this.data_groups.get(crf.group)
        switch (status) {
            case "hold":
                target.hold(id)
                this.data_btn_status.set(id, status)
                break

            case "off":
                target.off(id)
                target.text(id, crf.name)
                this.data_btn_status.delete(id)
                break

            case "on":
            default:
                target.on(id)
                this.data_btn_status.set(id, status)
                if (text) {
                    target.text(id, text)
                }
                break
        }
    }

    set_value(id: string, value_new: string, crf: crf_meta) {
        console.log("canvas_panel_set_value:", id, value_new, crf)
        const cc = this.ref_canvas_container
        if (cc) {
            this.data.set(id, value_new)
            switch (id) {
                case "t":
                    const media_current = this.ref_main_panel.get_current_play_info()
                    cc.set_page_time_label(crf.id, value_new, media_current.time)
                    break

            }
        }
    }

    get_value(id: string) {
        return this.data.get(id)
    }
}
