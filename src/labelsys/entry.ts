import "jquery"
// import $ from "jquery"
import "bootstrap"
import "admin-lte"
import * as common from "../common/common";
import * as myTimer from "./labelsys_timer";
import {UI} from "./labelsys_ui";
import {LabelData} from "./labelsys_data";
import {BasicContainer} from "./labelsys_container";
import {VideoContainer} from "./labelsys_container";
import {PolyPart} from "./labelsys_parts";
import {MediaContainer} from "./labelsys_container";
import {BasicPanel} from "./labelsys_panel";
import {CanvasPanel} from "./labelsys_panel";
import {ButtonGroup} from "./labelsys_buttons";
import {Button} from "./labelsys_buttons"
import $ from "jquery";

const XMLNS = "http://www.w3.org/2000/svg";

// const CURRENT_PAGE_URL = "http://localhost/ui/labeltool/stream/d2/author?crf=4ap"
// const url_api_host = `http://localhost/api/v1`

const CURRENT_PAGE_URL = document.URL
const api_root = '/api/v1'

let MEDIA_SCALE = 0
let MEDIA_LOCK_INTERVAL = 0
const MUST_FULL_BUFFERED = false


let ref_main_panel: any;
let media_lock_timer:any;


let USR_DATA_STORAGE:LabelData
let USR_MEDIA_UUID = ""
let USR_API_BASE =""
let USR_SUBMIT_LEVEL=""


/**
 * 主面板，功能主体
 */
export class MainPanel extends BasicPanel {
    ref_canvas_panel: CanvasPanel
    ref_system_panel: SystemPanel
    ref_media_container: MediaContainer
    ref_video_container: VideoContainer
    ref_canvas_container: CanvasContainer
    DEF_MODE_INPUT = "i"
    DEF_MODE_CONTROL = "c"
    user_mode = this.DEF_MODE_CONTROL

    ref_btn_play: JQuery | null = null;
    ref_btn_stop: JQuery | null = null
    ref_btn_prev: JQuery | null = null
    ref_btn_next: JQuery | null = null
    ref_btn_next_label: JQuery | null = null
    ref_btn_prev_label: JQuery | null = null
    ref_btn_loop: JQuery | null = null
    ref_video_playtime: JQuery | null = null

    ref_bg: any
    ref_pg_play: any
    ref_pg_play_str: any
    ref_pg_buffer: any

    data_format_duration
    data_media_info: MediaInfo
    data_select: Map<string, any>
    flag_video_mode: boolean


    timer_metadata: any
    timer_osd_update: myTimer.Timer | undefined
    timer_buffer: any

    constructor(parent: JQuery, media_info: MediaInfo, media_url: string,label_data:LabelData) {
        super(parent, "main_panel",label_data, new UI())
        this.data_format_duration = common.TimeFormat(media_info.duration);
        this.data_select = new Map;
        this.flag_video_mode = (media_info.frames > 0);
        this.data_media_info = media_info

        this.obj_main.height("100%").width("100%")
        this.initResizeListeners()
        this.initKeyPressListeners()

        this.user_mode = this.DEF_MODE_CONTROL

        this.ref_canvas_panel = new CanvasPanel($("#creator"), "panel-canvas", this.usr_label_data, this.ref_ui ,this )
        this.ref_system_panel = new SystemPanel($("#system",), "panel-system", this.usr_label_data, this.ref_ui)

        this.ref_media_container = new MediaContainer(this, "container-media", "calc(100% - 70px)")
        this.ref_video_container = new VideoContainer(this.ref_media_container, "container-video", media_url, media_info, false, this.on_play)
        this.ref_canvas_container = new CanvasContainer(this.ref_media_container, "container-canvas", this, this.usr_label_data)

        this.ref_canvas_panel.set_canvas_ref(this.ref_canvas_container)


        this.ref_ui.bgFrozen(true)

        this.timer_metadata = new myTimer.Timer(() => {
            if (this.ref_video_container.get_flag_metaloaded()) {
                // console.info("Timer.metaload stop")
                this.timer_metadata.stop()
                this.onMetaLoaded()
                this.ref_ui.popupContent = "数据预载结束"
                this.ref_ui.message("数据预载结束", false)
            } else {
                this.ref_ui.message("数据载入未完成...", true)
            }
        })
        this.timer_metadata.start(100)
    }

    on_play(frame: number) {
        // console.log("main_panel_on_play", this.obj_main,frame)
    }

    exit() {
        LabelToolSystemExit()
    }

    set_mode_input() {
        this.user_mode = this.DEF_MODE_INPUT
    }

    /**
     * 窗口调整监听
     */
    initResizeListeners() {
        const callback = (mutationsList: any, observer: any) => {
            for (let mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    console.log('A child node has been added or removed.');
                } else if (mutation.type === 'attributes') {
                    // console.log('The ' + mutation.attributeName + ' attribute was modified.');
                    if (mutation.attributeName === "style") {
                        this.onResize()
                    }
                }
            }
        };
        const observer = new MutationObserver(callback);
        observer.observe($(".content-wrapper")[0], {attributes: true, childList: false, subtree: false});

        window.addEventListener("resize", (e) => {
            this.onResize()
        })
    }

    /**
     * 按键监听器
     */
    initKeyPressListeners() {
        $(document).on("keydown", (e) => {
            switch (this.user_mode) {
                case this.DEF_MODE_CONTROL:
                    this.onKeyDown(e.keyCode || e.which || e.charCode)
                    break

                case this.DEF_MODE_INPUT:
                    break
            }
        })
    }


    set_value(group: string, value: string, crf: crf_meta) {
        // console.log("button set value", group, value, crf)
        switch (crf.domain) {
            case "global":
                this.usr_label_data.set_global(group, parseInt(crf.value))
                break
            case "frame":
                switch (group) {
                    case "t":
                        this.ref_canvas_container.set_page_time_label(crf.id, value, this.ref_video_container.get_current_time())
                        break
                    default:
                }
                console.log("set value/F")
                this.currentPageSave()
                break
            default:

        }
        this.data_select.set(group, value)
    }

    get_value(group: string) {
        if (this.data_select.has(group)) {
            return this.data_select.get(group)
        } else {
            return null
        }
    }

    has_value(group: string) {
        return this.data_select.has(group)
    }

    del_value(group: string) {
        this.data_select.delete(group)
    }

    get_part(id: string) {
        return this.ref_canvas_container.get_part(id)
    }

    has_part(id: string) {
        return this.ref_canvas_container.has_part(id)
    }

    del_part(id: string) {
        console.log('remove part', id)
        switch (id) {
            case "all":
                if (this.ref_ui.confirm(`确认删除本帧全部标注结构？`)) {
                    this.ref_canvas_container.get_activates().forEach((isAct, id) => {
                        this.ref_canvas_container.del_part(id)
                        this.ref_canvas_panel.set_button(id, "off", null)

                    })
                }
                break
            case "activate":
                this.ref_canvas_container.get_activates().forEach((isAct, id) => {
                    if (isAct && this.ref_ui.confirm(`确认删除标注结构：${id}？`)) {
                        this.ref_canvas_container.del_part(id)
                        this.ref_canvas_panel.set_button(id, "off", null)
                    }
                })
                break
            default:
                if (this.ref_canvas_container.has_part(id)) {
                    this.ref_canvas_container.del_part(id)
                    this.ref_canvas_panel.set_button(id, "off", null)
                }
        }
    }

    get_current_play_info() {
        return this.ref_video_container.get_current_all()
    }

    onGlobalFinishDownload() {
        let q = this.usr_label_data.get_global("q")
        if (q) {
            let id = `FQ${q}`
            this.ref_canvas_panel.set_button(id, "on", null)
        }
        this.skipToFrame(0)
    }


    on_crf_ready() {
        this.ref_canvas_panel.load_crf()
    }

    onMouseScroll(e: any) {
        let delta = (e.originalEvent.wheelDelta && (e.originalEvent.wheelDelta > 0 ? 1 : -1)) ||  // chrome & ie
            (e.originalEvent.detail && (e.originalEvent.detail > 0 ? -1 : 1));// firefox
        if (delta > 0) {
            ref_main_panel.prevFrame()
        } else if (delta < 0) {
            ref_main_panel.nextFrame()
        }
    }

    onMetaLoaded() {
        // console.groupCollapsed("main panel on metaloaded")
        // console.log("create progress bar")
        this.progressBarCreate()
        // console.log("create progress tag")
        this.progressTagCreate()
        // console.log("create control bar")
        this.controlBarCreate()

        // console.log("resize window")
        this.onResize()

        $(this.obj_main).on("mousewheel DOMMouseScroll", this.onMouseScroll)
        // console.info("Timer.buffer start")
        this.timer_buffer = new myTimer.Timer(() => {
            if (!MUST_FULL_BUFFERED || this.data_media_info.duration === 0 || this.progressBufferMonitor()) {
                // console.info("Timer.buffer stop")
                this.timer_buffer.stop()
                this.ref_ui.message("完成视频载入", false)
                this.ref_ui.popupContent = ""
                this.ref_ui.bgUnfrozen()
            }
        })
        this.timer_buffer.start(100)
        // console.groupEnd()
    }

    onResize() {
        let d = this.ref_video_container.get_window_info()

        let mcs = this.ref_media_container.get_window_info()
        let containerH = mcs.height
        let containerW = mcs.width
        let containerScale = containerW / containerH

        if (MEDIA_SCALE >= containerScale) {
            d.width = containerW
            d.height = containerW / MEDIA_SCALE
            d.left = 0
            d.top = (containerH - d.height) / 2
        } else {
            d.height = containerH
            d.width = containerH * MEDIA_SCALE
            d.left = (containerW - d.width) / 2
            d.top = 0
        }
        this.ref_video_container.set_window_info(d)
        this.ref_canvas_container.set_window_info(d)
    }

    onKeyDown(code: number) {
        switch (code) {
            // ESC
            case 27:
                this.ref_canvas_container.page_load(null)
                break;
            // P
            case 80:
                this.play()
                break;
            // Enter
            case 13:
                break;
            // Z
            case 90://z
                this.ref_canvas_container.undo();
                break;
            // X, U
            case 88:
            case 85:
                this.ref_canvas_container.redo();
                break;
            // Del, D, Backspace
            case 46:
            case 68:
            case 8:
                ref_main_panel.delPart("activate")
                break;
            // Q
            case 81:
                ref_main_panel.delPart("all");
                break;
            // H
            case 72:
                if (this.ref_canvas_container.get_canvas_hidden()) {
                    this.ref_canvas_container.show_all_parts()
                } else {
                    this.ref_canvas_container.hide_all_parts()
                }
                break;
            // Home
            case 36:
                this.skipToFrame(0)
                break;
            // End
            case 35:
                this.skipToFrame(-1)
                break;
            // left
            case 37:
                this.prevFrame()
                break;
            // right
            case 39:
                this.nextFrame();
                break;
            // <
            case 188:
                this.prevLabel()
                break;
            // >
            case 190:
                this.nextLabel()
                break;
            default:
            // console.log(code.toString());
        }
    }

    play() {
        // console.debug("btn play click")
        this.currentPageSave()
        let obj_play = this.ref_btn_play
        if (obj_play) {
            if (this.ref_video_container.play()) {
                obj_play.html('<i class="fas fa-pause-circle"></i>')
                this.ref_canvas_container.page_new()
                this.osd_auto_update_start()

            } else {
                obj_play.html('<i class="fas fa-play-circle"></i>')
                // console.log("current frame",this.vc.currentTime,this.vc.currentFrame)
                this.update(this.ref_video_container.get_current_all())
                this.osdAutoUpdateStop()

            }
        }

    }

    stop() {
        let obj_play = this.ref_btn_play
        if (obj_play) {
            obj_play.html('<i class="fas fa-play-circle"></i>')
        }
        this.ref_video_container.stop()
        this.osdAutoUpdateStop();
        this.osd_manual_update();
    }

    skipToFrame(frame: number) {
        this.currentPageSave()
        this.update(this.ref_video_container.jumpTo(frame))
    }

    prevFrame() {
        this.currentPageSave()
        const media_current = this.ref_video_container.prev()
        this.update(media_current)
    }

    nextFrame() {
        this.currentPageSave()
        this.update(this.ref_video_container.next())
    }

    update(d: MediaCurrent) {
        if (d) {
            console.debug("main panel: frame to", d.frame)
            this.progressPlay = d.progress
            this.currentPageLoad(d.frame)
        }
    }

    prevLabel() {
        this.currentPageSave()
        let vc = this.ref_video_container
        let f = this.usr_label_data.before(vc.get_current_frame())
        if (!!f) {
            vc.set_current_frame(f)
            this.update(vc.get_current_all())
        } else {
            this.ref_ui.message("无标注信息", false)
        }
    }

    nextLabel() {
        this.currentPageSave()
        let vc = this.ref_video_container
        let f = this.usr_label_data.after(vc.get_current_frame())
        if (!!f) {
            vc.set_current_frame(f)
            this.update(vc.get_current_all())
        } else {
            this.ref_ui.message("无标注信息", false)
        }
    }

    currentPageSave() {
        // let cc = this.ref_canvas_container
        // if (cc.get_page_is_modified()) {
        //     this.usr_label_data.set_page(cc.get_current_page(), cc.get_page_data())
        //     console.log("current page save")
        // }
    }

    currentPageLoad(page: number) {
        this.ref_canvas_container.page_load(page)
        this.ref_canvas_panel.set_current_page(page)
    }

    osd_auto_update_start() {
        let t = this.timer_osd_update
        if (t) {
            // console.info("Timer.osd stop 1")
            t.stop()
        } else {
            t = new myTimer.Timer(this.osd_manual_update.bind(this))
            this.timer_osd_update = t
        }
        // console.info("Timer.osd start")
        let reflush_time = Math.floor(500 / this.data_media_info.fps)
        if (reflush_time < 20) {
            reflush_time = 20
        }
        t.start(reflush_time)
    }

    osdAutoUpdateStop() {
        if (this.timer_osd_update) {
            this.timer_osd_update.stop()
        }
    }

    osd_manual_update() {
        // console.debug("osd upd")
        this.ref_canvas_container.page_load(null)
        this.progressPlay = this.ref_video_container.get_progress()
    }

    controlBarUpdate() {
        let t = common.TimeFormat(this.ref_video_container.get_current_time())
        let obj = this.ref_video_playtime
        if (obj) {
            obj.text(`${t} / ${this.data_format_duration}`)
        }
    }

    controlBarCreate() {
        let videoControlCenter = $("<div class='row'/>").height(40);
        let videoPlaytime = $("<div/>").text(`0:00.000 / ${this.data_format_duration}`);
        // Left control
        let btnPlay = $("<button class='btn btn-info videoBtn'/>").html('<i class="fas fa-play-circle"></i>')
        let btnStop = $("<button class='btn btn-info videoBtn'/>").html('<i class="fas fa-stop-circle"></i>')
        let btnPFra = $("<button class='btn btn-info videoBtn'/>").html('<i class="fas fa-arrow-alt-circle-left"></i>')
        let btnNFra = $("<button class='btn btn-info videoBtn'/>").html('<i class="fas fa-arrow-alt-circle-right"></i>')
        let btnPLab = $("<button class='btn btn-info videoBtn'/>").html('<i class="fas fa-chevron-circle-left"></i>')
        let btnNLab = $("<button class='btn btn-info videoBtn'/>").html('<i class="fas fa-chevron-circle-right"></i>')
        let LA = $("<div class='col-md-5 btn-group videoControl'/>").append(btnPlay).append(btnStop).append(btnPFra).append(btnNFra).append(btnPLab).append(btnNLab)
        // Right control
        let btnLoop = $("<input />").attr("type", "checkbox").attr("name", "videoLoopEnable").attr("value", "loop")
        let labelLoop = $("<div />").append(btnLoop).append(`  循环`)
        let RA = $("<div class='col-md-1 align-self-center text-center'/>").append(labelLoop);
        // Middle
        let MA = $("<div class='col-md-6 videoControl align-self-center text-center' />").append(videoPlaytime);

        videoControlCenter.append(LA).append(MA).append(RA);

        if (this.flag_video_mode) {
            btnPlay.click(this.play.bind(this))
            btnStop.click(this.stop.bind(this))
            btnPFra.click(this.prevFrame.bind(this))
            btnNFra.click(this.nextFrame.bind(this))
            btnPLab.click(this.prevLabel.bind(this))
            btnNLab.click(this.nextLabel.bind(this))
            btnLoop.attr("checked", "checked").click(() => {
                this.ref_video_container.set_loop(!this.ref_video_container.get_loop())
            })
        } else {
            btnPlay.addClass("disabled")
            btnStop.addClass("disabled")
            btnPFra.addClass("disabled")
            btnNFra.addClass("disabled")
            btnPLab.addClass("disabled")
            btnNLab.addClass("disabled")
            btnLoop.addClass("disabled")

        }

        this.obj_main.append(videoControlCenter);

        this.ref_btn_play = btnPlay
        this.ref_btn_stop = btnStop
        this.ref_btn_prev = btnPFra
        this.ref_btn_next = btnNFra
        this.ref_btn_next_label = btnNLab
        this.ref_btn_prev_label = btnPLab
        this.ref_btn_loop = btnLoop
        this.ref_video_playtime = videoPlaytime
    }

    set_progress_buffer(percent: number) {
        this.ref_pg_buffer.css("width", `${percent}%`);
    }

    set progressPlay(percent: number) {
        let progress = Math.floor(percent * 10000) / 100
        let p = `${progress}%`
        if (this.ref_pg_play_str && this.ref_pg_play) {
            this.ref_pg_play_str.text(p);//进度条文字进度
            this.ref_pg_play.css("width", p);//调整控制条长度
            this.controlBarUpdate()
        }
    }

    progressBarCreate() {
        let bg = $("<div class='progress videoProgressBackground'/>")
        let pp = $("<div class='progress-bar bg-primary progress-bar-striped videoProgressFront'/>").css("width", 0);
        let pb = $("<div class='progress-bar bg-warning videoProgressFront'/>").css("width", 0);
        let str = $("<span />").addClass('videoProgressStr').text("0%");

        pp.append(str);
        bg.append(pb).append(pp).on("click", (e) => {
            let obj = this.ref_bg
            let x = e.pageX - obj.offset().left
            let w = x / obj.width()

            this.progressPlay = w

            this.update(this.ref_video_container.set_progress(w))
        })

        this.obj_main.append(bg);
        this.ref_bg = bg
        this.ref_pg_play = pp
        this.ref_pg_play_str = str
        this.ref_pg_buffer = pb
    }

    progressTagCreate() {
        let bg = $('<div class="bg-gray"/>').height(10)
        this.obj_main.append(bg)
    }

    progressBufferMonitor() {
        let buf = this.ref_video_container.get_video_buffered_percentage();
        if (buf > 0) {
            this.ref_ui.message(`载入进度1：${buf}%`, true)
        }
        this.set_progress_buffer(buf);
        return (buf >= 100)
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

    label_storage: LabelData
    ref_svg: any

    activate_id: string = ""

    data_page_current: number = 0
    data_page_parts = new Map<string, PolyPart>()

    constructor(parent: MediaContainer, id: string, main_panel: MainPanel, label_storage: LabelData) {
        super(parent, id);

        this.current_mode = this.DEF_MODE_DISABLE
        this.ref_main_panel = main_panel
        this.label_storage = label_storage

        this.page_load(0)
        this.obj_main.css("z-index", 2).addClass("lsWorkspaceOverlay").css("left", 0).css("top", 0)

    }


    get_page_is_modified() {
        return this.flag_page_is_modified
    }

    set_page_is_modified(b: boolean) {
        this.flag_page_is_modified = b
    }

    get_canvas_hidden(): boolean {
        return this.obj_main.css("display") === "none"
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

        let data = this.label_storage.get_page(page)
        if (data) {
            console.groupCollapsed("page draw part", data)

            data.clabels.forEach((value, id) => {
                console.info("draw part:", id, value)
                const crf_data = this.label_storage.get_crf_data(id)
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
        this.label_storage.upload()
        this.page_load(null)
        // console.groupEnd()
    }

    set_page_time_label(id: string, describe: string, time: number) {
        // console.warn("page set time", id, describe, time)
        const page = this.get_current_page()
        const stor = this.label_storage
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
        const data = this.label_storage.get_page(this.get_current_page())
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
        console.log("hide all parts")
        this.obj_main.hide()
    }

    show_all_parts() {
        this.obj_main.show()
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

        let page_data = this.label_storage.get_page(this.get_current_page())
        if (page_data) {
            page_data.clabels.delete(id)
            this.label_storage.set_page(this.get_current_page(), page_data)
        }
    }

    update_part(id:string,part_label_data:LabelPart) {
        console.log("canvas update", id, part_label_data)
        const page = this.get_current_page()
        let page_data = this.label_storage.get_page(page)
        if (page_data) {
            page_data.clabels.set(id, part_label_data)
            this.label_storage.set_page(page,page_data)
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
            this.obj_main.append(o)
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
                console.log("create_point for",this.get_activate_id())
                let obj = this.data_page_parts.get(this.get_activate_id())
                if (obj) {
                    obj.set_is_modified(true)
                    obj.pointCreate(this.getPosition(e), null)
                }
                break
            case this.DEF_MODE_MODIFY:

                break
            default:
                console.log("canvas is not ready")
        }
    }

    do_on_r_click() {
        console.log("cc right click mode:", this.current_mode, this)
        switch (this.current_mode) {
            case this.DEF_MODE_CREATE:
            case this.DEF_MODE_MODIFY:
                console.log("active:",this.get_activate_id())
                let obj = this.data_page_parts.get(this.get_activate_id())
                if (obj && obj.get_is_modified()) {
                    obj.confirm()
                } else if (obj) {
                    obj.cancel()
                }
                this.current_mode = this.DEF_MODE_DISABLE
                break

            default:
        }
    }

    onResize() {
        this.page_load(this.get_current_page())
    }

    getPosition(e:any) {
        let o = this.obj_main.offset()
        let d = this.get_window_info()

        let x = (e.pageX - o.left)
        let y = (e.pageY - o.top)

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
        this.obj_main.click(this.do_on_l_click.bind(this)).contextmenu(this.do_on_r_click.bind(this))
        console.log("canvas enable")
        this.current_mode = this.DEF_MODE_ENABLE
    }

    canvas_disable() {
        console.log("canvas disable")
        this.obj_main.off("click").off("contextmenu")
        this.current_mode = this.DEF_MODE_DISABLE
    }

    hideVideo() {
        this.obj_main.css("background-color", "white")
    }
}










/**
 * 系统面板，右侧隐藏
 */
class SystemPanel extends BasicPanel {
    memo
    system
    admin

    constructor(parent: JQuery, id: string, label_data: LabelData, ui: UI) {
        super(parent, id, label_data, ui)
        let ul = $('<ul class="nav nav-pills nav-sidebar flex-column nav-flat" data-widget="treeview" role="menu" data-accordion="false"/>')
        let nav = $('<nav class="mt-0" />').append(ul)
        this.ref_main_list = ul
        this.obj_main.addClass("sidebar").append(nav)
        // 用户备注
        this.memo = new ButtonGroup(this, "备注内容", true, null, null, null, null, ui)
        this.memo.addMemo(5, "输入备注信息……", USR_API_BASE + '/label/memo');
        this.system = new SystemButtonGroup(this, "系统工具", true, ui, label_data)
        this.admin = new AdminButtonGroup(this, "管理工具", false, ui)
    }
}


/**
 * 系统按钮组
 */
class SystemButtonGroup extends ButtonGroup {
    constructor(parent:any, title:string, open:boolean,ui:UI,label_stor:LabelData) {
        super(parent, title, open, null, null, null, null, ui);
        let senddata: SendData = {media: USR_MEDIA_UUID, direction: "upload", admin: "", data: null}
        switch (USR_SUBMIT_LEVEL) {
            case "author":
                let btn = new Button("usr-submit", "提交审核", 12, "#67afe5", "", 0, () => {
                    label_stor.post_author_submit().then((resp) => {
                        if (resp.code == 200 && resp.data == "exit") {
                            LabelToolSystemExit
                        } else {
                            ui.message(resp.msg, resp.code !== 200)
                        }
                    })
                }, null)
                this.mainObj.append(btn.get_object())
                break

            case "review":
                let btnReject = new Button("usr-reject", "驳回", 6, "#cc6666", "", 0, () => {
                    if (ui.confirm("确认驳回？")) {
                        label_stor.post_reviewer_reject().then((resp) => {
                            if (resp.code === 200 && resp.data === "exit") {
                                LabelToolSystemExit()
                            } else {
                                ui.message(resp.msg, resp.code !== 200)
                            }
                        })
                    }
                }, null)
                let btnConfirm = new Button("usr-confirm", "通过", 6, "#99ffcc", "", 0, () => {
                    label_stor.post_reviewer_confirm().then((resp) => {
                        if (resp.code === 200 && resp.data === "exit") {
                            LabelToolSystemExit()
                        } else {
                            ui.message(resp.msg, resp.code !== 200)
                        }
                    })
                }, null)

                this.mainObj.append(btnConfirm.get_object()).append(btnReject.get_object())
                break
        }
    }
}


/**
 * 管理员按钮组
 */
class AdminButtonGroup extends ButtonGroup {
    constructor(parent:any, title:string, open:boolean,ui:UI) {
        super(parent, title, open,null,null,null,null,ui);
        let obj = new Button("usr-drop","清空全部标注",12, "#dc3545","",0, ()=> {
            if (ui.confirm("警告！确认后将清空本媒体对应的全部标注数据")) {
                ui.message("未授权操作", true)
            }
        },null)
        this.mainObj.append(obj.get_object())

        obj = new Button("usr-export","导出标注",  6,"","",0,()=> {
            ui.prompt("标注内容", USR_DATA_STORAGE.get_usr_data())
        },null)
        this.mainObj.append(obj.get_object())

        obj = new Button("usr-import","导入标注", 6,"","",0,()=> {
            let data = ui.prompt("数据内容", USR_DATA_STORAGE.get_usr_data())
            if (data) {
                USR_DATA_STORAGE.set_usr_data(data)

                console.log("up 2")
                USR_DATA_STORAGE.upload()
            } else {
                ui.message("导入已取消", true)
            }
        },null)
        this.mainObj.append(obj.get_object())

        obj = new Button("usr-release","至无标注状态", 6, "", "",6,()=> {
            let data = ui.prompt("需要管理员提权，删除后本窗口将关闭",undefined)
            if (data) {
                $.ajax({
                    url: USR_API_BASE + '/label/full',
                    type: 'DELETE',
                    data: JSON.stringify({"admin": data}),
                }).done(resp => {
                    if (resp.code === 200 && resp.data === "exit") {
                        LabelToolSystemExit()
                    } else {
                        ui.message(resp.msg, resp.code !== 200)
                    }
                })
            }
        },null)
        this.mainObj.append(obj.get_object())

        obj = new Button("revoke","至无审阅状态",  6, "", "",6,()=> {
            let data = ui.prompt("调整审阅状态需要管理员提权",undefined)
            if (data) {
                const senddata = JSON.stringify({"admin": data})
                // console.log("senddata", senddata)
                // /api/v1/media/MEDIA/label/:op
                $.post(USR_API_BASE + '/label/review?do=revoke', senddata).done(resp => {
                    if (resp.code === 200 && resp.data === "exit") {
                        LabelToolSystemExit()
                    } else {
                        ui.message(resp.msg, resp.code !== 200)
                    }
                })
            }
        },null)
        this.mainObj.append(obj.get_object())
    }
}


/**
 * 退离函数，处理交互退出相关任务
 * @constructor
 */
function LabelToolSystemExit() {
    window.onbeforeunload = null
    ref_main_panel.close()
    media_lock_timer.unlock(() => {
        window.close()
    })
}


const url_info = common.AnalysisURL(CURRENT_PAGE_URL)
const url_api_media_root = `${api_root}/labelsys/${url_info.path_class}/index/${url_info.path_indexer}`
const url_media_info = `${url_api_media_root}/info/full`

common.GetData(url_media_info).then((resp: any) => {
    let media_info = resp as ServerResponse
    if (media_info.code !== 200) {
        console.error("媒体信息反馈异常", url_media_info)
        console.debug("D",resp)
    } else {
        let data = media_info.data as MediaInfo;

        USR_MEDIA_UUID = url_info.path_indexer
        USR_SUBMIT_LEVEL = url_info.path_base
        USR_API_BASE = url_api_media_root

        MEDIA_SCALE = data.width / data.height
        // console.log("mi", data, "ui", url_info)
        // ui = new myUi.UI()
        USR_DATA_STORAGE = new LabelData(url_api_media_root, url_info)
        let sig_crf = USR_DATA_STORAGE.DownloadCrf()
        USR_DATA_STORAGE.DownloadUsr()
        ref_main_panel = new MainPanel($("#main-content"), data, "http://localhost" + data.url,USR_DATA_STORAGE);
        media_lock_timer = new myTimer.MediaLockerObj(MEDIA_LOCK_INTERVAL, `${url_api_media_root}/lock`)
        sig_crf.then(() => {
            ref_main_panel.on_crf_ready()
        })
        //
        // window.onbeforeunload = () => {
        //     mlocker.unlock();
        //     return "确认关闭标注界面么？"
        // };// 退出响应
        document.body.oncontextmenu = () => {
            return false
        }// 右键响应
        // mlocker.lock()// 媒体定时锁
        // mp.init()// 初始化界面
    }
})


