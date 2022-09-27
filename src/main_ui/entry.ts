import {GetData} from "../common/common";
import {Class_menu} from "./class_menu";
import {Class_main} from "./class_main";

// const api_root = "/api/v1"
// const ui_root = "/ui"
//
const api_root = "http://localhost/api/v1"
const ui_root = "http://localhost/ui"

class Copyright {
    constructor() {
        console.log("Copyright @ Uni-Minds 2019-2022");
    }

    async init() {
        let url = `${api_root}/raw?action=getversion`
        let resp = await GetData(url) as ServerResponse
        if (resp.code == 200) {
            $(".main-footer").html(resp.data);
        }
    }
}


// sidebar
//
// open|close|hide
function sidebar(action:string) {
    switch (action) {
        case "open":
            $(document.body).addClass("sidebar-mini").removeClass("sidebar-collapse")
            break

        case "close":
            $(document.body).addClass("sidebar-mini sidebar-collapse")
            break

        case "hide":
            $(document.body).removeClass("sidebar-mini").addClass("sidebar-collapse")
            break
    }
}

let main = new Class_main("#main-content",api_root,ui_root)
let menu = new Class_menu(api_root,main)
let cr = new Copyright()
cr.init().then(()=> {
    menu.load_username()
}).then(()=> {
    menu.load_menu()
// }).then(()=> {
    // main.start("/ui/screen?type=us")
})