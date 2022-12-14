import {GetData} from "../common/common";
import {class_menu} from "./class_menu";
import {class_main} from "./class_main";

const api_root = "/api/v1"
const ui_root = "/ui"

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

let main = new class_main("#main-content",api_root,ui_root)
let menu = new class_menu(api_root,main)
let cr = new Copyright()
cr.init().then(()=> {
    menu.load_username()
}).then(()=> {
    menu.load_menu()
// }).then(()=> {
    // main.start("/ui/screen?type=us")
})