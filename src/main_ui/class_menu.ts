import {GetData} from "../common/common";
import {class_main} from "./class_main";

export class class_menu {
    root
    menu_activated: JQuery | undefined
    api_root: string = "/api/v1"
    ref_main: class_main

    constructor(api_root: string, ref_main: class_main) {
        this.root = $("#menu-left nav ul");
        this.ref_main = ref_main
        if (api_root != "") {
            this.api_root = api_root
        }
    }

    async load_username() {
        let url = `${this.api_root}/user?action=getrealname`
        let resp = await GetData(url) as ServerResponse
        if (resp.code == 200) {
            this.set_username(resp.data)
        } else {
            this.set_username("异常用户")
        }


    }

    async load_menu() {
        let url = `${this.api_root}/raw?action=getmenujson`
        let resp = await GetData(url) as ServerResponse
        if (resp.code == 200) {
            let menu_data = resp.data as ServerMenu[];
            menu_data.forEach((menu) => {
                if (menu.child && menu.child.length > 0) {
                    let parent = this.create_parent(menu.name, menu.icon);
                    let tree = $('<ul class="nav nav-treeview"></ul>');
                    parent.append(tree);
                    this.root.append(parent);

                    let childlen = menu.child.length;
                    for (let j = 0; j < childlen; j++) {
                        let child = menu.child[j];
                        let obj = this.create_child(child.id, child.name, child.icon, child.controller);
                        tree.append(obj);
                    }
                } else {
                    let obj = this.create_child(menu.id, menu.name, menu.icon, menu.controller);
                    this.root.append(obj);
                }
            })
        }
    }

    create_parent(name: string, icon: string): JQuery {
        return $(`<li class="nav-item has-treeview"><a href="#" class="nav-link"><i class="nav-icon ${icon}"></i><p>${name}</p><i class="right fas fa-angle-left"></i></a></li>`);
    }

    create_child(id: string, name: string, icon: string, controller: string): JQuery {
        // console.log("child", id, name)
        if (id == null) {
            return $(`<li class="nav-item"><a href="${controller}" class="nav-link"><i class="nav-icon ${icon}"></i><p>${name}</p></a></li>`);
        } else {
            let obj = $(`<li class="nav-item"><a id="${id}" href="#" class="nav-link"><i class="nav-icon ${icon}"></i><p>${name}</p></a></li>`);
            obj.on("click", () => {
                this.menu_active(id)
                this.ref_main.start(controller)
            })
            return obj
        }
    }

    set_username(u: string) {
        let obj = $('.sidebar .info .d-block');
        if (u) {
            obj.attr('href', '/logout').text(u);
        }
    }

    menu_active(id: string) {
        this.menu_activated?.removeClass("active")

        let obj = $(`#${id}`);
        if (obj.length) {
            obj.addClass("active");
            let objParent = obj.parents()[2];
            if ($.nodeName(objParent, "li")) {
                $(objParent).addClass("menu-open");
            }
            this.menu_activated = obj
        }
    }
}