import $ from "jquery";
import {UI} from "./labelsys_ui";

/**
 * 按钮组父类
 */
export class ButtonGroup {
    // parent: any;
    mainObj: JQuery;
    data_count:number =0;
    data_select:string = ""

    crfs = new Map<string, JQuery>();
    ref_buttons = new Map<string, Button>();
    ref_ui:UI

    def_group_buttons_color = ""



    func_on_btn_click_l: any
    func_on_btn_click_r:any

    constructor(canvas_panel: any, title: string, open: boolean, group_title_circle_color: string|null,default_buttons_color:string|null, func_l: any, func_r: any,ui:UI) {
        // console.debug("new btn:",title,open,circleColor)
        this.ref_ui=ui
        let cColor: string
        if (default_buttons_color) {
            this.def_group_buttons_color = default_buttons_color
        }

        if (func_l != null) {
            this.func_on_btn_click_l = func_l
        }
        if (func_r != null) {
            this.func_on_btn_click_r = func_r
        }

        // let nav = $('<li class="nav-item has-treeview" />')
        let nav = $('<li class="nav-item" />')
        if (open) {
            // console.debug("disable menu open",title)
            nav.addClass("menu-open")
        }

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

        let header = $(`<a href="#" class="nav-link"><i class="nav-icon far fa-circle ${cColor}"></i><i class="nav-icon far fa-circle-thin "></i><p>${title}<i class="fas fa-angle-left right"></i></p></a>`)
        let tree = $('<ul class="nav nav-treeview"></ul>')

        nav.append(header).append(tree)
        canvas_panel.ref_main_list.append(nav)

        // this.parent = canvas_panel
        this.mainObj = tree
        // this.data.radio = !!radio
    }

    addButtons(btn_data: ButtonInfo[]) {
        let obj_line: JQuery<HTMLElement>
        let line_count = 0

        btn_data.forEach((btn: ButtonInfo) => {
            let obj = new Button(btn.id, btn.name, 0,btn.color, this.def_group_buttons_color, 0, () => {
                if (this.func_on_btn_click_l != null) {
                    this.func_on_btn_click_l(btn.id)
                }
            }, () => {
                if (this.func_on_btn_click_r != null) {
                    this.func_on_btn_click_r(btn.id)
                }
            })

            if (line_count > 2 || line_count == 0) {
                line_count = 0
                obj_line = this.new_line()
                this.mainObj.append(obj_line)
            }

            obj_line.append(obj.get_object())
            this.ref_buttons.set(btn.id, obj)
            line_count++
        })
    }

    addMemo(rows: number, placeholder: string, api_memo: string) {
        rows = (rows) ? rows : 3
        let urlMemo = api_memo
        const obj_memo = $(`<textarea class="form-control" id="usermemo" rows="${rows}" placeholder="${placeholder}"></textarea>`)

        let func_onclick = () => {
            const senddata = JSON.stringify({media: "", data: obj_memo.val(), direction: 'upload',})
            $.post(urlMemo, senddata).done(resp => {
                if (resp.code === 200) {
                    btn_memo.set_color("#28a745")
                    setTimeout(() => {
                        btn_memo.set_color("#ff851b")
                    }, 1000)

                    $.get(urlMemo).done(resp => {
                        if (resp.code === 200) {
                            obj_memo.val(resp.data)
                        }
                    })

                } else {
                    alert(resp.msg)
                }
            })
        }

        const btn_memo = new Button("save_memo", "保存备注", 12, "", "#ff851b", 0, func_onclick, () => {
        })

        $.get(urlMemo).done(resp => {
            if (resp.code === 200) {
                obj_memo.val(resp.data)
            }
        })

        this.mainObj.append(obj_memo).append(btn_memo.get_object())
        this.ref_buttons.set("memo", btn_memo)
    }

    new_line() {
        return $('<div />').addClass("row").css("margin", 0)
    }


    off(id: string) {
        if (id != "") {
            let obj = this.ref_buttons.get(id)
            if (obj != undefined) {
                obj.set_deactivate()

            }
        }
    }

    on(id: string) {
        if (id != "") {
            let obj = this.ref_buttons.get(id)
            if (obj != undefined) {
                obj.set_activate()
            }
        }
    }

    hold(id: string) {
        if (id != "") {
            let obj = this.ref_buttons.get(id)
            if (obj != undefined) {
                obj.set_hold()
            }
        }
    }

    text(id: string, txt: string) {
        if (id) {
            let obj = this.ref_buttons.get(id)
            if (obj != undefined) {
                obj.set_text(txt)
            }
        }
    }
}


export class Button {
    obj_main: JQuery<HTMLButtonElement>
    color_btn: string
    color_group: string

    constructor(id: string, name: string, button_length: number, btn_color: string, group_color: string, word_cut: number, func_l: any, func_r: any) {
        button_length = (button_length > 0) ? button_length : 4
        word_cut = (word_cut) ? word_cut : 5

        const content = (name.length > word_cut) ? `${name.substring(0, word_cut - 1)}…` : name

        const obj = $(`<button class="crfBtn crfBtnNone col-md-${button_length}" title="${name}"/>`) as JQuery<HTMLButtonElement>
        obj.html(`<div id="name">${content}</div><div id="id" class="crfBtnId">${id}</div>`)

        if (func_l!=null) {
            obj.on("click", func_l)
        }
        if (func_r!=null) {
            obj.on("contextmenu", func_r)
        }

        this.color_group = group_color
        this.color_btn = btn_color
        obj.css("background-color", btn_color)

        this.obj_main = obj
    }

    set_activate() {
        this.obj_main.removeClass("crfBtnNone").removeClass("crfBtnHold")
        this.set_color(undefined)
    }

    set_deactivate() {
        this.obj_main.removeClass("crfBtnHold").addClass("crfBtnNone")
        this.set_color("")
    }

    set_hold() {
        this.obj_main.removeClass("crfBtnNone").addClass("crfBtnHold")
        this.set_color(undefined)
    }

    set_text(txt: string) {
        this.obj_main.children("#name").text(txt)
    }

    set_color(color: string | undefined) {
        this.obj_main.css("background-color", (color != undefined) ? color : this.color_btn)
    }

    get_object() {
        return this.obj_main
    }
}
