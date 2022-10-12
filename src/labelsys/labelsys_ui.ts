import $ from "jquery"


export class UI {
    ref_popup_msgbox
    ref_backdrop

    data: {}
    flag_show_popup_msgbox = true

    constructor() {
        this.data = {}

        this.ref_popup_msgbox = $(`<div class="modal fade" id="modal-overlay" style="display: none;">
              <div class="modal-dialog"><div class="modal-content">
                <div class="overlay"><i class="fas fa-2x fa-sync fa-spin"></i></div>
                <div class="modal-body"><p></p></div>            </div></div></div>`)
        $("#ui-message-window").append(this.ref_popup_msgbox)

        this.ref_backdrop = $('<div class="modal-backdrop fade"></div>')

        this.message("系统正在初始化", false)
    }


    message(msg: string, warn: boolean) {
        if (warn) {
            console.warn("MSG :", msg)
        } else {
            console.info("WARN:", msg)
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