import {class_list_label} from "./class_list_label";
import {class_list_screen} from "./class_list_screen";

export class Class_main {
    obj_main: JQuery
    root_api = "/api/v1"
    root_ui = "/ui"

    constructor(id:string,api_root:string,ui_root:string) {
        this.obj_main = $(id)
        if (api_root != "") {
            this.root_api = api_root
        }

        if (ui_root != "") {
            this.root_ui = ui_root
        }
    }

    start(proc: string) {
        console.log("start:", proc)
        this.clean()
        switch (proc) {
            // 标注检索 - 超声标注
            case "/ui/medialist?type=us":
                let medialist_us_def: MedialistGroupDefine[] = []
                medialist_us_def.push({id: "selectLabelGroupId", name: "标注组", type: "label", reflush: true})
                medialist_us_def.push({id: "selectScreenGroupId", name: "挑图组", type: "screen", reflush: true})
                medialist_us_def.push({id: "selectView", name: "切面", type: "", reflush: true})
                medialist_us_def.push({id: "showReviewedOnly", name: "仅显示挑图通过", type: "", reflush: true})

                let medialist_us_obj = new class_list_label(this.obj_main, medialist_us_def, this.root_api, this.root_ui, "media")
                medialist_us_obj.Start()
                break

            // 标注检索 - 流媒体
            case "/ui/medialist?type=stream":
                let medialist_stream_def: MedialistGroupDefine[] = []
                medialist_stream_def.push({id: "selectLabelGroupId", name: "所属中心", type: "stream", reflush: true})
                medialist_stream_def.push({id: "showReviewedOnly", name: "仅显示挑图通过", type: "", reflush: true})

                let medialist_stream_obj = new class_list_label(this.obj_main, medialist_stream_def, this.root_api, this.root_ui, "stream")
                medialist_stream_obj.Start()
                break

            // 标注检索 - ct标注
            case "/ui/medialist?type=ct":
                alert("not ready:"+ proc)
                break


            // 挑图 - us
            case "/ui/screen?type=us":
                let screen_us = new class_list_screen(this.obj_main,this.root_api)
                screen_us.Start()
                break

            // 挑图 - ct
            case "/ui/screen?type=ct":
                break

            // 挑图 - stream
            case "/ui/screen?type=stream":
                break

            default:
                document.location = proc
        }
    }

    clean() {
        this.obj_main.empty()

    }
}