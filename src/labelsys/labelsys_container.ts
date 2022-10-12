require("toastr")
import $ from "jquery";
import Hls from "hls.js";
// @ts-ignore
import * as toastr from "toastr/build/toastr.min.js"
import {LabelData} from "./labelsys_data";
import {PolyPart} from "./labelsys_parts";
import {MainPanel} from "./entry";


const XMLNS = "http://www.w3.org/2000/svg";

/**
 * 容器父类
 */
export class BasicContainer {
    ref_main: JQuery

    constructor(ref_parent: JQuery, id: string) {
        const container = $(`<div id="${id}"/>`)
        ref_parent.append(container)
        this.ref_main = container
    }

    set_window_info(data: WindowInfo) {
        let obj = this.ref_main
        obj.width(`${data.width}px`)
        obj.height(`${data.height}px`)
        obj.css("top", `${data.top}px`)
        obj.css("left", `${data.left}px`)

        this.onResize()
    }

    get_window_info(): WindowInfo {
        let obj = this.ref_main
        let width = obj.width()
        let height = obj.height()
        if (width && height) {
            return {
                width: width,
                height: height,
                left: obj.position().left,
                top: obj.position().top,
            }
        } else {
            return {
                width: 0,
                height: 0,
                left: 0,
                top: 0
            }
        }
    }

    onResize() {
    }
}


/**
 * 媒体容器，包含视频及标注容器，主要用于自适应尺寸变更及一致性保护
 */
export class MediaContainer extends BasicContainer {
    constructor(ref_parent: JQuery, id: string, height: string) {
        super(ref_parent, id);
        this.ref_main.height(height).addClass("lsWorkspaceBG")
    }
}


/**
 * 视频容器
 */
export class VideoContainer extends BasicContainer {
    private id_video_player = "video"

    private readonly ref_video_player: HTMLVideoElement
    private flag_loop = true
    private flag_metadata_loaded = false

    private data_media_info: MediaInfo
    private data_frames_times: number[] = []
    private data_current_frame = 0

    private timer_video_player: any

    private readonly func_on_time_update: (f: number) => void

    constructor(ref_parent: JQuery, id: string, media_info: MediaInfo, show_controls: boolean, func_on_time_update: (f: number) => void) {
        super(ref_parent, id);
        this.ref_main.css("z-index", 1).height("100%").width("100%").addClass("lsWorkspaceOverlay").css("margin", "0 auto")

        this.data_media_info = media_info

        // create player
        const player = $(`<video id='${this.id_video_player}' style='height: 100%;width: 100%' preload='auto'/>`).on("ended", () => {
            this.flag_loop ? this.play() : this.stop()
        })
        this.ref_video_player = player[0] as HTMLVideoElement
        this.func_on_time_update = func_on_time_update

        if (show_controls) {
            player.attr("controls", "controls")
        }

        this.ref_main.append(player);

        this.init_frames_times()

        if (media_info.url != "") {
            this.video_load(media_info.url, media_info.must_hls)
        } else {
            toastr.error("数据异常，未找到视频")
        }
    }

    video_load(url: string, use_hls: boolean) {
        const video = this.ref_video_player

        if (use_hls && Hls.isSupported()) {
            console.debug("video load by hls:",url)
            let hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                this.set_flag_metaloaded(true)
            })
        } else {
            console.debug("video load by H5:", url)
            // if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.setAttribute("type", "video/ogv");
            video.src = url;

            $(video).on("loadedmetadata", () => {
                let player = this.ref_video_player
                let inv = setInterval(() => {
                    let dur = player.duration

                    if (dur == Infinity) {
                        player.currentTime = 0.01
                        console.debug("强制跳转：duration=infinity")
                        return
                    }

                    let progress = dur / this.data_media_info.duration * 100
                    // ui.popupContent = `载入进度：${progress.toFixed(1)}%`
                    // console.log("loading media: progress=", progress)

                    // 判断加载进度
                    if (progress > 60 || this.data_media_info.duration < 1) {
                        // console.log("loading media: finished")
                        clearInterval(inv)
                        player.currentTime = 0
                        this.set_flag_metaloaded(true)
                        this.init_frames_times()
                        // mainPanel.vc.onMetaLoaded()
                    }
                }, 500)
            });
        }
    }

    set_frames_data(data: number[]) {
        this.data_frames_times = data
    }

    get_frames_data(): number[] {
        return this.data_frames_times
    }

    set_flag_metaloaded(b: boolean) {
        this.flag_metadata_loaded = b
    }

    get_flag_metaloaded(): boolean {
        return this.flag_metadata_loaded
    }

    convert_frame_to_time(frame: number): number {
        if (frame < 0) {
            return 0
        }

        const t = frame / this.data_media_info.fps
        console.debug("conv f2t", frame, t)
        return t
    }

    convert_time_to_frame(second: number): number {
        if (second < 0) {
            return 0
        }

        let frame = Math.floor(second * this.data_media_info.fps)
        console.debug("conv s2f:", second, frame)
        return frame
    }

    init_frames_times() {
        const frames = this.data_media_info.frames
        // console.log(`frames init ${frames}f`)
        if (!frames) {
            // 图片模式
            this.set_frames_data([0])

        } else {
            // 视频模式 生成帧对应时间
            let step = parseFloat((1 / this.data_media_info.fps).toFixed(6));
            let data = []
            for (let i = 0; i < this.data_media_info.duration; i += step) {
                data.push(i);
            }
            this.set_frames_data(data)
        }
    }

    get_video_size() {
        let p = this.ref_video_player
        return {"width": p.videoWidth, "height": p.videoHeight}
    }

    set_loop(b: boolean) {
        this.flag_loop = b
    }

    get_loop(): boolean {
        return this.flag_loop
    }

    get_progress(): number {
        const ct = this.ref_video_player.currentTime
        const cc = this.data_media_info.duration
        return ct / cc
    }

    get_current_time(): number {
        return this.ref_video_player.currentTime
    }

    get_current_frame(): number {
        return this.data_current_frame
    }

    get_time_from_frame(f: number): number {
        const db = this.data_frames_times
        f = (f > db.length) ? db.length : (f < 0) ? 0 : f
        // console.log("get_time_from_frame", f, time)
        return db[f]
    }

    set_progress(p: number):MediaCurrent {
        p = (p < 0) ? 0 : (p > 1) ? 1 : p
        const target_frame = Math.floor(p * this.data_media_info.frames)
        this.set_current_frame(target_frame)
        return this.get_current_all()
    }

    set_current_time(second: number):MediaCurrent {
        // console.warn("set_current_time", second)
        let player = this.ref_video_player
        player.currentTime = second

        return this.get_current_all()
    }

    set_current_frame(f: number):MediaCurrent {
        f = (f < 0) ? 0 : (f > this.data_media_info.frames) ? this.data_media_info.frames : f
        const t = this.get_time_from_frame(f)
        console.log("set current frame:", f, "time:", t)
        this.data_current_frame = f
        this.func_on_time_update(f)
        this.set_current_time(t)
        return this.get_current_all()
    }

    get_current_all(): MediaCurrent {
        return {frame: this.get_current_frame(), time: this.get_current_time(), progress: this.get_progress()}
    }

    play(): boolean {
        let p = this.ref_video_player;
        if (p.paused || p.ended) {
            if (p.ended) {
                p.currentTime = 0;
            }

            this.timer_video_player = setInterval(() => {
                const f = Math.round(this.get_progress() * this.data_media_info.frames)
                this.data_current_frame = f
                this.func_on_time_update(f)
            }, 500 / this.data_media_info.fps)

            p.play()
            return true

        } else {
            this.pause();
            return false
        }
    }

    pause() {
        if (this.timer_video_player > 0) {
            clearInterval(this.timer_video_player)
        }
        this.ref_video_player.pause()
    }

    stop() {
        if (this.timer_video_player > 0) {
            clearInterval(this.timer_video_player)
        }
        this.ref_video_player.pause()
        this.set_current_frame(0)
    }

    next(): MediaCurrent {
        if (!this.ref_video_player.paused) {
            this.pause()
        }

        let f = this.get_current_frame() + 1
        this.set_current_frame(f)
        return this.get_current_all()
    }

    prev(): MediaCurrent {
        if (!this.ref_video_player.paused) {
            this.pause()
        }
        let f = this.get_current_frame()
        f = (f > 0) ? f - 1 : 0
        this.set_current_frame(f)
        return this.get_current_all()
    }

    jump_to(frame: number): MediaCurrent {
        if (!this.ref_video_player.paused) {
            this.pause()
        }
        this.set_current_frame(frame)
        return this.get_current_all()
    }

    get_video_buffered_percentage() {
        const buffered = this.ref_video_player.buffered;
        if (buffered.length) {
            return buffered.end(0) / this.data_media_info.duration;
        } else {
            return 0
        }
    }
}


/**
 * 标注容器
 */
export class CanvasContainer extends BasicContainer {
    DEF_MODE_DISABLE = "d"
    DEF_MODE_CREATE = "c"
    DEF_MODE_MODIFY = "m"
    DEF_MODE_POINT = 'p'
    DEF_MODE_ENABLE = "e"

    current_mode = ""

    flag_page_is_modified = false

    ref_main_panel: MainPanel

    usr_label_stor: LabelData
    ref_svg: any

    activate_id: string = ""

    data_page_current: number = 0
    data_page_parts = new Map<string, PolyPart>()

    data_point_template: JQuery<SVGElement>[]

    constructor(ref_parent:JQuery, id: string, main_panel: MainPanel, usr_label_stor: LabelData) {
        super(ref_parent, id);

        this.current_mode = this.DEF_MODE_DISABLE
        this.ref_main_panel = main_panel
        this.usr_label_stor = usr_label_stor
        this.data_point_template = []

        this.page_load(0)
        this.ref_main.css("z-index", 2).addClass("lsWorkspaceOverlay").css("left", 0).css("top", 0)

    }


    get_page_is_modified() {
        return this.flag_page_is_modified
    }

    set_page_is_modified(b: boolean) {
        this.flag_page_is_modified = b
    }

    get_canvas_hidden(): boolean {
        return this.ref_main.css("display") === "none"
    }

    get_current_page() {
        return this.data_page_current
    }

    set_current_page(page: number) {
        this.data_page_current = page
    }

    get_page_ids(): string[] {
        let t = []
        let k = this.data_page_parts.keys()
        while (1) {
            let d = k.next()
            t.push(d.value)
            if (d.done) {
                break
            }
        }
        return t
    }

    page_new() {
        this.svg.empty()
        this.set_page_is_modified(false)
        this.data_page_parts = new Map
    }

    /**
     * 加载页数据
     * @param page 页号
     */
    page_load(page: number | null) {
        // pageLoad(null)
        if (page == null) {
            page = this.get_current_page()
        }
        // console.debug("canvas count.: load page:", page)

        this.page_new()
        this.set_current_page(page)

        // let page_data = this.label_storage.get_page(page)
        // console.log("pdata", page_data)
        // this.set_page_data(page_data)

        let data = this.usr_label_stor.get_page(page)
        if (data) {
            console.groupCollapsed("page draw part", data)

            data.clabels.forEach((value, id) => {
                console.info("draw part:", id, value)
                const crf_data = this.usr_label_stor.get_crf_data(id)
                if (crf_data) {
                    const color = crf_data.color
                    let p = new PolyPart(id, this, color)
                    p.set_point_data(value.cPoints)
                    p.redraw()
                    this.data_page_parts.set(id, p)
                }
            })
            console.groupEnd()
        }
    }

    page_save() {
        // console.groupCollapsed("page save:", this.data_page_current, this.get_page_data())
        // this.label_storage.set_page(this.get_current_page(), this.get_page_data())
        this.usr_label_stor.upload()
        this.page_load(null)
        // console.groupEnd()
    }

    set_page_time_label(id: string, describe: string, time: number) {
        // console.warn("page set time", id, describe, time)
        const page = this.get_current_page()
        const stor = this.usr_label_stor
        let data = stor.get_page(page)
        describe = (id == "SPEC") ? describe : id
        if (!data) {
            data = {cdescribe: describe, cid: id, ctime: time, clabels: new Map<string, LabelPart>(), q: 0}
            stor.set_page(page, data)
        } else {
            data.cid = id
            data.cdescribe = describe
            data.ctime = time
            stor.set_page(page, data)
        }
    }


    get_page_time_label(): string|null {
        const page = this.get_current_page()
        const data = this.usr_label_stor.get_page(page)
        console.log("usr_label_stor", this.usr_label_stor, data, page)
        if (data) {
            return data.cdescribe
        } else {
            return null
        }
    }

    // save_part(id: string, data: any) {
    //     console.log("page save part", id, data)
    //     this.data_page_data.set(id, data)
    //     this.page_save()
    //     this.ref_main_panel.ref_canvas_panel.set_button(id, "on","")
    //
    //     this.page_load(this.get_current_page())
    // }

    hide_all_parts() {
        this.ref_main.hide()
    }

    show_all_parts() {
        this.ref_main.show()
    }

    has_part(id: string) {
        return this.data_page_parts.has(id)
    }

    get_part(id: string) {
        return this.data_page_parts.get(id)
    }

    del_part(id: string) {
        console.log("cc remove part", id)
        let part = this.data_page_parts.get(id)
        if (!part) {
            return
        }

        part.deactivate()
        part.remove()

        this.data_page_parts.delete(id)
        this.set_page_is_modified(true)

        let page_data = this.usr_label_stor.get_page(this.get_current_page())
        if (page_data) {
            page_data.clabels.delete(id)
            this.usr_label_stor.set_page(this.get_current_page(), page_data)
        }
    }

    update_part(id:string,part_label_data:LabelPart) {
        console.log("canvas update", id, part_label_data)
        const page = this.get_current_page()
        let page_data = this.usr_label_stor.get_page(page)
        if (page_data) {
            page_data.clabels.set(id, part_label_data)
            this.usr_label_stor.set_page(page,page_data)
        } else {
            alert("no page 821")
        }
    }

    get_activates():Map<string,boolean> {
        let ids = new Map
        this.data_page_parts.forEach((v, id) => {
            if (v.get_is_activate()) {
                ids.set(id, true)
            } else {
                ids.set(id, false)
            }
        })
        return ids
    }

    // 重做Part
    redo() {
        console.warn("disable redo")
        // switch (this.current_mode) {
        //     case this.DEF_MODE_CREATE:
        //         let activate_id = this.get_activate_id()
        //         let tmp = this.data_page_parts.get(activate_id)
        //         if (!tmp) {return}
        //         console.log("CanvasContainer.redo()")
        //         let flg = tmp.pointRedo()
        //         if (!flg) {
        //             break
        //         }
        //         let points = tmp.points_get_all()
        //         let keys = points.keys()
        //         let id = ""
        //         while (true) {
        //             let o = keys.next()
        //             console.log("o = ", o)
        //             if (o.done) {
        //                 break
        //             }
        //             id = o.value
        //         }
        //         let p = points.get(id)
        //         if (p) {
        //             p = tmp.WHtoXY(p)
        //         }
        //
        //         let obj = tmp.new_svg("circle").attr("cx", `${p.x}`).attr("cy", `${p.y}`).attr("id", id)
        //             .attr("r", 3.2).attr("fill", "red").attr("stroke", "black").attr("stroke-width", 0.5)
        //             .hover(tmp.onAttention)
        //             .click(tmp.pointOnClick.bind(tmp))
        //             .contextmenu(tmp.pointOnContext.bind(tmp))
        //         tmp.mainObj.parent().append(obj);
        //         break
        //     default:
        //         ui.message('仅在creat模式下允许重做,当前模式为：' + this.current_mode, true)
        // }
    }

    // 撤销Part
    undo() {
        console.warn("disable undo")
        // switch (this.current_mode) {
        //     case this.DEF_MODE_CREATE:
        //         console.log("CanvasContainer.undo()")
        //         let obj = this.data_page_parts.get(this.get_activate_id())
        //         if (obj) {
        //             let flg = obj.pointUndo()
        //             if (flg) {
        //                 this.obj_main[0].firstElementChild.lastElementChild.remove()
        //             }
        //         }
        //
        //         break
        //     default:
        //         console.error('仅在creat模式下允许撤销,当前模式为：' + this.current_mode, true)
        // }
    }

    // 批量清除部件
    remove(id: string) {
        let p = this.data_page_parts
        switch (id) {
            case "activate":
                p.forEach((v, id) => {
                    if (v.get_is_activate()) {
                        this.del_part(id)
                    }
                })
                break

            case "all":
                p.forEach((v, id) => {
                    this.del_part(id)
                })
                break

            default:
                this.del_part(id)
        }
    }

    get svg() {
        if (!this.ref_svg) {
            let obj = document.createElementNS(XMLNS, "svg")
            let o = $(obj).attr("width", "100%").attr("height", "100%")
            this.ref_main.append(o)
            this.ref_svg = o
        }
        return this.ref_svg
    }

    createCommon(id:string, color:string) {
        let obj = new PolyPart(id, this, color)
        this.data_page_parts.set(id, obj)
    }

    do_on_l_click(e:any) {
        switch (this.current_mode) {
            case this.DEF_MODE_CREATE:
                // console.log("create_point for",this.get_activate_id())
                let obj = this.data_page_parts.get(this.get_activate_id())
                if (obj) {
                    obj.set_is_modified(true)
                    // 存储临时点
                    this.data_point_template.push(obj.point_create(this.getPosition(e), null))
                }
                break
            case this.DEF_MODE_MODIFY:

                break
            default:
                toastr.warning("画板模式异常，请刷新页面。M=" + this.current_mode)
        }
    }

    do_on_r_click() {
        // console.log("cc right click mode:", this.current_mode)
        switch (this.current_mode) {
            case this.DEF_MODE_CREATE:
            case this.DEF_MODE_MODIFY:
                // 支持模式c 与m
                let obj = this.data_page_parts.get(this.get_activate_id())
                obj?.deactivate()
                this.data_point_template.forEach((p) => {
                    p.remove()
                })
                this.current_mode = this.DEF_MODE_DISABLE
                break

            default:
        }
    }

    onResize() {
        this.page_load(this.get_current_page())
    }

    getPosition(e:any) {
        let left = 0, top = 0
        let o = this.ref_main.offset()
        let d = this.get_window_info()

        if (o) {
            left = o.left
            top = o.top
        }

        let x = (e.pageX - left)
        let y = (e.pageY - top)

        let w = parseFloat((x * 100 / d.width).toFixed(3))
        let h = parseFloat((y * 100 / d.height).toFixed(3))

        return {x, y, w, h}
    }

    activate(id:string, type:string, color:string) {
        this.canvas_enable()
        this.set_activate_id(id)
        if (this.data_page_parts.has(id)) {
            let obj = this.data_page_parts.get(id)
            if (obj) {
                obj.activate()
                this.current_mode = this.DEF_MODE_MODIFY
            }
        } else {
            console.log("creator part:", id, type, color)
            switch (type) {
                case "com":
                    this.createCommon(id, color)
                    break

                default:
                    alert(`Unknown type: ${type}`)
                    return
            }
            this.current_mode = this.DEF_MODE_CREATE
        }
    }

    deactivate(id: string) {
        this.set_activate_id("")
        console.log("canvas container deactivate:", id)
        if (this.data_page_parts.has(id)) {
            let obj = this.data_page_parts.get(id)
            if (obj) {
                console.log("cc found part", obj)
                if (!obj.deactivate()) {
                    console.log("cc remove part", id)
                    this.del_part(id)
                }
            }
        }
        this.canvas_disable()
    }

    set_activate_id(id: string) {
        this.activate_id = id
    }

    get_activate_id() {
        return this.activate_id
    }

    canvas_enable() {
        this.canvas_disable()
        this.ref_main.click(this.do_on_l_click.bind(this)).contextmenu(this.do_on_r_click.bind(this))
        console.log("canvas enable")
        this.current_mode = this.DEF_MODE_ENABLE
    }

    canvas_disable() {
        console.log("canvas disable")
        this.ref_main.off("click").off("contextmenu")
        this.current_mode = this.DEF_MODE_DISABLE
    }

    hideVideo() {
        this.ref_main.css("background-color", "white")
    }
}
