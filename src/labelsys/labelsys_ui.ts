import $ from "jquery"


export class UI {
    ref_popup_msgbox
    ref_copyright
    ref_info_log
    ref_backdrop

    ref_main: JQuery

    data: {}
    flag_show_popup_msgbox = true

    constructor() {
        this.data = {}

        this.ref_popup_msgbox = $(`<div class="modal fade" id="modal-overlay" style="display: none;">
              <div class="modal-dialog"><div class="modal-content">
                <div class="overlay"><i class="fas fa-2x fa-sync fa-spin"></i></div>
                <div class="modal-body"><p></p></div>            </div></div></div>`)
        $("#ui-message-window").append(this.ref_popup_msgbox)


        this.ref_main = $('<div id="ui-constructor" class="row" />').height(48)
        $("#main-footer").css("padding", 0).append(this.ref_main)

        // this.createInfoPanel()
        let obj1 = $('<div class="col-md-10 text-center align-self-center" />').css("padding", 0)
        let info = $('<div/>')
        obj1.append(info)

        this.ref_info_log = info
        this.ref_main.append(obj1)

        // this.createCopyright()
        let obj2 = $('<div class="col-md-2 text-center align-self-center bg-white" />').css("padding", 0)
        let t1 = `core-sys 3.0<br/>(c) 2018 - 2022`
        let t2 = `Liuxy [BUAA]<br/>Uni-Minds.com`
        let t = $('<div />').html(t1).hover(() => {
            this.ref_copyright.html(t2)
        }, () => {
            this.ref_copyright.html(t1)
        })
        obj2.append(t)

        this.ref_copyright = t
        this.ref_main.append(obj2)

        // create backdrop
        this.ref_backdrop = $('<div class="modal-backdrop fade"></div>')

        this.message("系统正在初始化", false)
    }


    message(msg: string, warn: boolean) {
        this.ref_info_log.text(msg)
        // console.info("UI MSG:", msg)
        if (warn) {
            this.ref_main.addClass("bg-gradient-red").removeClass("bg-gradient-yellow")
        } else {
            this.ref_main.addClass("bg-gradient-yellow").removeClass("bg-gradient-red")
        }
    }

    confirm(msg: string) {
        return confirm(msg)
    }

    prompt(msg: string, def: string | undefined) {
        return prompt(msg, def)
    }

    alert(msg: string) {
        return alert(msg)
    }

    set popupContent(msg: string) {
        // console.info("UI POP:", message)
        const ref = this.ref_popup_msgbox
        if (msg) {
            if (!this.flag_show_popup_msgbox) {
                ref.addClass("show").css("display", "block")
                ref.find("p").text(msg)
                this.flag_show_popup_msgbox = true
            } else {
                ref.find("p").text(msg)
            }
        } else {
            ref.removeClass("show").css("display", "none")
            this.flag_show_popup_msgbox = false
        }
    }

    bgFrozen(show: boolean) {
        let backdrop = this.ref_backdrop

        if (show) {
            // console.debug("bg frozen")
            $(document.body).append(backdrop)
            backdrop.addClass("show")
        } else {
            // console.debug("bg unfrozen")
            backdrop.removeClass("show")
            backdrop.remove()
        }
    }

    bgUnfrozen() {
        // console.log("ui unfrozen",this)
        this.bgFrozen(false)
    }
}