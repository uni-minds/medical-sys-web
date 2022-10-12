import * as common from "../common/common";
import $, {map, post} from "jquery"
import "./labelsys_communicate"
import {export_usr_json, import_usr_json} from "./labelsys_communicate";
import {BuildURL, PostData} from "../common/common";
import toastr = require("toastr");

/**
 * 标注数据存储器
 */
export class LabelData {
    private readonly data_crf = new Map<string, crf_meta>()
    private readonly data_groups = new Map<string, crf_meta>()
    private data_usr: LabelTotalData

    data_media_uuid: string
    data_media_class: string
    data_crf_type: string
    data_submit_level: string
    data_label_uuid: string

    flag_init_crf = false
    flag_init_usr = false

    url_server_crf: string
    url_server_usr: string

    constructor(api_root: string, url_info: UrlInfo) {
        this.data_media_uuid = url_info.path_indexer
        this.data_media_class = url_info.path_class
        this.data_submit_level = url_info.path_base
        let crf = url_info.params.get("crf")
        let label_uuid = url_info.params.get("label_uuid")
        this.data_crf_type = crf ? crf : ""
        this.data_label_uuid = label_uuid ? label_uuid : ""

        this.url_server_crf = `${api_root}/label/crf?format=json`;
        this.url_server_usr = `${api_root}/label/${this.data_submit_level}`

        this.data_usr = {c: 0, q: 0, frames: []}
    }

    set_crf_data(data: crf_meta[]) {
        data.forEach((v) => {
            switch (v.type) {
                case "group":
                    this.data_groups.set(v.group, v)
                    break

                default:
                    this.data_crf.set(v.id, v)
            }
        })
    }

    get_crf_data(id: string): crf_meta | undefined {
        // console.log("CRF",this.data.crf)
        return this.data_crf.get(id)
    }

    get_crf_data_all(): Map<string, crf_meta> {
        return this.data_crf
    }

    set_usr_data(str: string) {
        this.data_usr = import_usr_json(str)
    }

    get_usr_data(): string {
        let data = this.data_usr
        data.c = data.frames.length
        if (data) {
            return export_usr_json(data)
        } else {
            return ""
        }
    }

    get_crf_groups(): Map<string, crf_meta> {
        return this.data_groups
    }

    set_global(group: string, value: number) {
        console.log("set global value:", group, "<-", value)
        switch (group) {
            case "q":
                this.data_usr.q = value
                break
            default:
                console.error("unknown global:", group)
        }
        this.upload()
    }

    get_global(group: string): number | null {
        switch (group) {
            case "q":
                return this.data_usr.q
            default:
                return null
        }
    }

    set_page(page: number, data: LabelPage) {
        // console.log(`set page=${page}:`, data)
        this.data_usr.frames[page] = data
        this.upload().then((resp) => {
            if (resp.code != 200) {
                toastr.error(resp.msg, resp.code.toString())
            }
        })
    }

    get_page(page: number): LabelPage | null {
        if (this.has_page(page)) {
            return this.data_usr.frames[page]
        } else {
            return null
        }
    }

    set_page_part(page: number, id: string, data: LabelPart) {
        let frame = this.data_usr.frames[page]
        frame.clabels.set(id, data)
        this.data_usr.frames[page] = frame
    }

    crfGroup(group: string) {
        let data: any[] = []
        this.data_crf.forEach((v) => {
            if (v.group === group)
                data.push(v)
        })
        return data
    }

    get_group_data(id: string): crf_meta | undefined {
        return this.data_groups.get(id)
    }

    has_page(page: number): boolean {
        const data = this.data_usr
        if (this.flag_init_usr && data.frames) {
            return (page > data.frames.length) ? false : !!data.frames[page]
        } else {
            return false
        }
    }

    after_page(page: number): number {
        let t = this.data_usr.frames.length
        page = (page < t) ? page : 0
        for (let i = 0; i < t; i++) {
            page = (page === (t - 1)) ? 0 : page + 1
            if (this.has_page(page)) return page
        }
        return -1
    }

    before_page(page: number): number {
        let t = this.data_usr.frames.length
        page = (page < t) ? page : t - 1
        for (let i = 0; i < t; i++) {
            page = (page === 0) ? t - 1 : page - 1
            if (this.has_page(page)) return page
        }
        return -1
    }

    async DownloadCrf() {
        let result = await common.GetData(this.url_server_crf) as ServerResponse
        if (result.code === 200) {
            this.set_crf_data(result.data)
            if (!this.flag_init_crf) {
                // mp.onCRFFinishDownload()
                // this.downloadFull()
                this.flag_init_crf = true
                console.debug("定义标注节点(CRF)同步完成", this.get_crf_data_all())
            }
        }
    }

    async DownloadUsr() {
        // console.debug("usr_url:",this.url_server_usr)
        let resp = await common.GetData(this.url_server_usr) as ServerResponse
        if (resp.code === 200) {
            // console.debug("dl _full:",resp.data)
            let data = resp.data

            switch (this.data_crf_type) {
                case "4ap":
                    data = data.replace(/DA"/g, 'DAO"')
                    data = data.replace(/DA_/g, 'DAO_')
                    break
                case "van":
                    data = data.replace(/DA"/g, 'DAO"')
                    data = data.replace(/DA_/g, 'DAO_')
                    break
            }
            this.set_usr_data(data)
            console.debug("用户标注数据(USR)同步完成", JSON.parse(this.get_usr_data()))
            this.flag_init_usr = true
        } else if (resp.code == 10001) {
            console.debug("数据无标注")
            this.flag_init_usr = true
        } else {
            toastr.error(resp.msg, `标注数据同步错误`)
        }
    }

    async upload() {
        let params = new Map<string, any>()
        params.set("label_uuid", this.data_label_uuid)

        const tmp: SendData = {
            media: this.data_media_uuid,
            data: this.get_usr_data(),
            direction: 'upload',
            admin: ""
        }
        let resp = await PostData(BuildURL(this.url_server_usr, params), tmp)
        return resp as ServerResponse
    }

    async post_author_submit() {
        return this.post_user_do("submit")
    }

    async post_reviewer_confirm() {
        return this.post_user_do("confirm")
    }

    async post_reviewer_reject() {
        return this.post_user_do("reject")
    }

    async post_user_do(action:string) {
        let params = new Map<string, any>()
        params.set("do", action)

        const tmp: SendData = {
            media: this.data_media_uuid,
            data: this.data_label_uuid,
            direction: 'upload',
            admin: ""
        }

        let resp = await PostData(BuildURL(this.url_server_usr, params), tmp)
        return resp as ServerResponse
    }
}
