import $ from "jquery";
import {UI} from "./labelsys_ui";
import {GetData, PostData} from "../common/common";
import {CanvasPanel, SystemPanel} from "./labelsys_panel";

/**
 * 按钮组父类
 */
export class CanvasButtonGroup {
    ref_main: JQuery;
    obj_buttons = new Map<string, Button>();

    data_count = 0;
    data_select = ""

    crfs = new Map<string, JQuery>();

    def_group_buttons_color: string | undefined

    func_on_btn_click_l: ((id: string) => void) | undefined
    func_on_btn_click_r: ((id: string) => void) | undefined

    constructor(canvas_panel: CanvasPanel | SystemPanel, title: string, open: boolean, group_title_circle_color: string | undefined, btns_default_color: string | undefined, func_l: ((id: string) => void) | undefined, func_r: ((id: string) => void) | undefined) {
        this.def_group_buttons_color = btns_default_color


        if (func_l) {
            this.func_on_btn_click_l = func_l
        }
        if (func_r) {
            this.func_on_btn_click_r = func_r
        }

        let nav = $('<li class="nav-item" />')
        if (open) {
            nav.addClass("menu-open")
        }

        let cColor: string
        switch (group_title_circle_color) {
            case "red":
                cColor = "text-danger"
                break
            case "yellow":
                cColor = "text-warning"
                break
            default:
                cColor = "text-info"
        }

        let header = $(`<a href="#" class="nav-link"><i class="nav-icon far fa-circle ${cColor}"></i><p>${title}</p><i class="fas fa-angle-left right"></i></a>`)
        let tree = $('<ul class="nav nav-treeview"></ul>')

        nav.append(header).append(tree)
        canvas_panel.ref_main.append(nav)
        this.ref_main = tree
    }

    add_buttons(btn_data: ButtonInfo[]) {
        let ref_line: JQuery<HTMLElement>
        let line_count = 0

        btn_data.forEach((btn: ButtonInfo) => {
            const color = btn.color ? btn.color : this.def_group_buttons_color ? this.def_group_buttons_color : "yellow"
            let obj = new Button(btn.id, btn.name, 0, btn.color, 0, this.func_on_btn_click_l, this.func_on_btn_click_r)

            if (line_count > 2 || line_count == 0) {
                line_count = 0
                ref_line = this.new_line()
                this.ref_main.append(ref_line)
            }

            ref_line.append(obj.get_object())
            this.obj_buttons.set(btn.id, obj)
            line_count++
        })
    }

    add_input(id: string, rows: number, placeholder: string, submit_button_name: string, api: string) {
        const color_btn_wait = "#ff851b"
        const color_btn_submit = "#35a728"
        rows = (rows) ? rows : 3

        const ref_form = $(`<textarea class="form-control" id="${id}_textarea" rows="${rows}" placeholder="${placeholder}" />`)

        let func_onclick = () => {
            const senddata: SendData = {media: "", data: ref_form.val(), direction: 'upload', admin: ''}
            PostData(api, senddata).then((data) => {
                if (data == undefined) {
                    return undefined
                }

                let resp = data as ServerResponse
                if (resp.code == 200) {
                    btn_submit.set_color(color_btn_submit)
                    ref_form.val(resp.data)
                    setTimeout(() => {
                        btn_submit.set_color(color_btn_wait)
                    }, 500)
                } else {
                    toastr.error(resp.msg)
                }
            })
        }

        const btn_submit = new Button("submit_input", submit_button_name, 12, color_btn_wait, 0, func_onclick, undefined)
        btn_submit.set_color_default()

        GetData(api).then((data) => {
            if (data == undefined) {
                return undefined
            }
            let resp = data as ServerResponse
            if (resp.code == 200) {
                ref_form.val(resp.data)
            }
        })

        this.ref_main.append(ref_form).append(btn_submit.get_object())
        this.obj_buttons.set(id, btn_submit)
    }

    new_line() {
        return $('<div class="row"/>').css("margin", 0)
    }


    off(id: string) {
        if (id != "") {
            const obj = this.obj_buttons.get(id)
            obj?.set_deactivate()
        }
    }

    on(id: string) {
        if (id != "") {
            const obj = this.obj_buttons.get(id)
            obj?.set_activate()
        }
    }

    hold(id: string) {
        if (id != "") {
            let obj = this.obj_buttons.get(id)
            obj?.set_hold()
        }
    }

    text(id: string, txt: string) {
        if (id) {
            let obj = this.obj_buttons.get(id)
            obj?.set_text(txt)
        }
    }
}

export class Button {
    ref_main: JQuery<HTMLButtonElement>
    color_btn: string
    word_cut: number

    constructor(id: string, name: string, button_length: number, btn_color: string, word_cut: number, func_l: ((id: string) => void) | undefined, func_r: ((id: string) => void) | undefined) {
        // console.log("create btn",name,id,btn_color)

        button_length = (button_length > 0) ? button_length : 4
        this.word_cut = (word_cut) ? word_cut : 5
        this.color_btn = btn_color

        const obj = $(`<button class="crfBtn crfBtnNone col-md-${button_length}" title="${name}"/>`) as JQuery<HTMLButtonElement>
        obj.html(`<div id="name" ></div><div id="id" class="crfBtnId">${id}</div>`)

        if (func_l) {
            obj.on("click", () => {
                func_l(id)
            })
        }
        if (func_r) {
            obj.on("contextmenu", () => {
                func_r(id)
            })
        }

        this.ref_main = obj
        this.set_text(name)
    }

    set_activate() {
        this.ref_main.removeClass("crfBtnNone").removeClass("crfBtnHold")
        this.set_color_default()
    }

    set_deactivate() {
        this.ref_main.removeClass("crfBtnHold").addClass("crfBtnNone")
        this.remove_color()
    }

    set_hold() {
        this.ref_main.removeClass("crfBtnNone").addClass("crfBtnHold")
        this.set_color_default()
    }

    set_text(name: string) {
        const content = (name.length > this.word_cut) ? `${name.substring(0, this.word_cut - 1)}…` : name
        this.ref_main.children("#name").text(content)
    }

    set_color(color: string | undefined) {
        if (color == undefined) {
            this.remove_color()
        } else {
            this.ref_main.css("background-color", (color == "def") ? this.color_btn : color)
        }
    }

    set_color_default() {
        this.ref_main.css("background-color", this.color_btn)
    }

    remove_color() {
        this.ref_main.css("background-color", "")
    }

    get_object() {
        return this.ref_main
    }
}
