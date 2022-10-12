import * as common from "../common/common";
import * as myTimer from "./labelsys_timer";
import toastr = require("toastr");
import {UI} from "./labelsys_ui";
import {LabelData} from "./labelsys_data";
import {CanvasContainer} from "./labelsys_container";
import {VideoContainer} from "./labelsys_container";
import {MediaContainer} from "./labelsys_container";
import {BasicPanel, SystemPanel} from "./labelsys_panel";
import {CanvasPanel} from "./labelsys_panel";

toastr.options={"closeButton":true,"timeOut":1000,"tapToDismiss":true}

const CURRENT_PAGE_URL = document.URL
const api_root = '/api/v1'

let MEDIA_SCALE = 0
let MEDIA_LOCK_INTERVAL = 0
const MUST_FULL_BUFFERED = false

let ref_main_panel: MainPanel;
let media_lock_timer:myTimer.MediaLockerObj;


/**
 * 主面板，功能主体
 */
export class MainPanel {
    ref_main: JQuery

    obj_canvas_panel: CanvasPanel
    obj_system_panel: SystemPanel
    obj_media_container: MediaContainer
    obj_video_container: VideoContainer
    obj_canvas_container: CanvasContainer

    obj_ui: UI

    DEF_MODE_INPUT = "i"
    DEF_MODE_CONTROL = "c"

    user_mode

    ref_btn_play: JQuery | undefined;
    ref_btn_stop: JQuery | undefined;
    ref_btn_prev: JQuery | undefined;
    ref_btn_next: JQuery | undefined;
    ref_btn_next_label: JQuery | undefined;
    ref_btn_prev_label: JQuery | undefined;
    ref_btn_loop: JQuery | undefined;
    ref_video_playtime: JQuery | undefined;

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

    data_usr_label: LabelData

    constructor(ref_main: JQuery, media_info: MediaInfo, label_data: LabelData, api_root: string) {
        this.ref_main = ref_main
        this.obj_ui = new UI()
        this.data_usr_label = label_data
        this.data_format_duration = common.TimeFormat(media_info.duration);
        this.data_select = new Map;
        this.flag_video_mode = (media_info.frames > 0);
        this.data_media_info = media_info

        this.ref_main.height("100%").width("100%")
        this.initResizeListeners()
        this.initKeyPressListeners()

        this.user_mode = this.DEF_MODE_CONTROL

        this.obj_canvas_panel = new CanvasPanel($("#menu-left nav ul"), this, this.data_usr_label, this.obj_ui)
        this.obj_system_panel = new SystemPanel($("#menu-system nav ul"), this, this.data_usr_label, this.obj_ui, api_root)

        let media_container = new MediaContainer(this.ref_main, "container-media", "calc(100% - 70px)")
        this.obj_video_container = new VideoContainer(media_container.ref_main, "container-video", media_info, false, this.on_play)
        this.obj_canvas_container = new CanvasContainer(media_container.ref_main, "container-canvas", this, this.data_usr_label)
        this.obj_media_container = media_container

        this.obj_canvas_panel.set_canvas_ref(this.obj_canvas_container)

        this.obj_ui.bgFrozen(true)

        this.timer_metadata = new myTimer.Timer(() => {
            if (this.obj_video_container.get_flag_metaloaded()) {
                // console.info("Timer.metaload stop")
                this.timer_metadata.stop()
                this.on_metaloaded()
                toastr.info("媒体数据预载结束,允许标注")
                console.log("metadata_load_finish")
            } else {
                console.debug("媒体载入未完成...")
            }
        })
        this.timer_metadata.start(300)
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
                        this.on_resize()
                    }
                }
            }
        };
        const observer = new MutationObserver(callback);
        observer.observe($(".content-wrapper")[0], {attributes: true, childList: false, subtree: false});

        window.addEventListener("resize", (e) => {
            this.on_resize()
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

    /*
    set_value(group: string, value: string, crf: crf_meta) {
        // console.log("button set value", group, value, crf)
        switch (crf.domain) {
            case "global":
                this.data_usr_label.set_global(group, parseInt(crf.value))
                break
            case "frame":
                switch (group) {
                    case "t":
                        this.obj_canvas_container.set_page_time_label(crf.id, value, this.obj_video_container.get_current_time())
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
        return this.obj_canvas_container.get_part(id)
    }

    has_part(id: string) {
        return this.obj_canvas_container.has_part(id)
    }
*/

    del_part(id: string) {
        console.log('remove part', id)
        switch (id) {
            case "all":
                if (this.obj_ui.confirm(`确认删除本帧全部标注结构？`)) {
                    this.obj_canvas_container.get_activates().forEach((isAct, id) => {
                        this.obj_canvas_container.del_part(id)
                        this.set_button_deactivate(id)

                    })
                }
                break
            case "activate":
                this.obj_canvas_container.get_activates().forEach((isAct, id) => {
                    if (isAct && this.obj_ui.confirm(`确认删除标注结构：${id}？`)) {
                        this.obj_canvas_container.del_part(id)
                        this.set_button_deactivate(id)
                    }
                })
                break
            default:
                if (this.obj_canvas_container.has_part(id)) {
                    this.obj_canvas_container.del_part(id)
                    this.set_button_deactivate(id)
                }
        }
    }

    set_button_activate(id: string) {
        this.obj_canvas_panel.set_button(id, "on", undefined)
    }

    set_button_deactivate(id: string) {
        this.obj_canvas_panel.set_button(id, "off", undefined)
    }

    set_button_hold(id: string) {
        this.obj_canvas_panel.set_button(id, "hold", undefined)
    }

    set_button_desc(id: string, isActivate: boolean, desc: string) {
        this.obj_canvas_panel.set_button(id, isActivate ? "on" : "off", desc)
    }

    get_current_play_info() {
        return this.obj_video_container.get_current_all()
    }

    on_crf_ready() {
        let crf_groups = this.data_usr_label.get_crf_groups()
        this.obj_canvas_panel.load_crf(crf_groups)
    }

    on_usr_ready() {
        let q = this.data_usr_label.get_global("q")
        console.log("配置质量标签 q=", q)

        if (q) {
            let id = `FQ${q}`
            this.obj_canvas_panel.set_button(id, "on", undefined)
        }
        this.update({frame:0,time:0,progress:0})
    }

    on_mouse_scroll(e: any) {
        let delta = (e.originalEvent.wheelDelta && (e.originalEvent.wheelDelta > 0 ? 1 : -1)) ||  // chrome & ie
            (e.originalEvent.detail && (e.originalEvent.detail > 0 ? -1 : 1));// firefox
        if (delta > 0) {
            ref_main_panel.prevFrame()
        } else if (delta < 0) {
            ref_main_panel.nextFrame()
        }
    }

    on_metaloaded() {
        // console.log("create progress bar")
        this.pg_bar_create()
        // console.log("create progress tag")
        this.pg_tag_create()
        // console.log("create control bar")
        this.control_bar_create()

        // console.log("resize window")
        this.on_resize()

        $(this.ref_main).on("mousewheel DOMMouseScroll", this.on_mouse_scroll)
        // console.info("Timer.buffer start")
        this.timer_buffer = new myTimer.Timer(() => {
            if (!MUST_FULL_BUFFERED || this.data_media_info.duration === 0 || this.pg_buffer_monitor()) {
                // console.info("Timer.buffer stop")
                this.timer_buffer.stop()
                toastr.info("完成视频载入")
                this.obj_ui.bgUnfrozen()
            }
        })
        this.timer_buffer.start(100)
    }

    on_resize() {
        let d = this.obj_video_container.get_window_info()

        let mcs = this.obj_media_container.get_window_info()
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
        this.obj_video_container.set_window_info(d)
        this.obj_canvas_container.set_window_info(d)
    }

    onKeyDown(code: number) {
        switch (code) {
            // ESC
            case 27:
                this.obj_canvas_container.page_load(null)
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
                this.obj_canvas_container.undo();
                break;
            // X, U
            case 88:
            case 85:
                this.obj_canvas_container.redo();
                break;
            // Del, D, Backspace
            case 46:
            case 68:
            case 8:
                ref_main_panel.del_part("activate")
                break;
            // Q
            case 81:
                ref_main_panel.del_part("all");
                break;
            // H
            case 72:
                if (this.obj_canvas_container.get_canvas_hidden()) {
                    this.obj_canvas_container.show_all_parts()
                } else {
                    this.obj_canvas_container.hide_all_parts()
                }
                break;
            // Home
            case 36:
                this.skip_to_frame(0)
                break;
            // End
            case 35:
                this.skip_to_frame(-1)
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
        this.currentPageSave()
        let obj_play = this.ref_btn_play

        if (this.obj_video_container.play()) {
            obj_play?.html('<i class="fas fa-pause-circle"></i>')
            this.obj_canvas_container.page_new()
            this.osd_auto_update_start()

        } else {
            obj_play?.html('<i class="fas fa-play-circle"></i>')
            // console.log("current frame",this.vc.currentTime,this.vc.currentFrame)
            this.update(this.obj_video_container.get_current_all())
            this.osd_auto_update_stop()

        }
    }

    stop() {
        let obj_play = this.ref_btn_play
        if (obj_play) {
            obj_play.html('<i class="fas fa-play-circle"></i>')
        }
        this.obj_video_container.stop()
        this.osd_auto_update_stop();
        this.osd_manual_update();
    }

    skip_to_frame(frame: number) {
        this.currentPageSave()
        this.update(this.obj_video_container.jump_to(frame))
    }

    prevFrame() {
        this.currentPageSave()
        const media_current = this.obj_video_container.prev()
        this.update(media_current)
    }

    nextFrame() {
        this.currentPageSave()
        this.update(this.obj_video_container.next())
    }

    update(d: MediaCurrent) {
        if (d) {
            console.debug("main panel: update to", d)
            this.set_progress_play(d.progress)
            this.obj_canvas_container.page_load(d.frame)
            this.obj_canvas_panel.page_load(d.frame)
        }
    }

    prevLabel() {
        this.currentPageSave()
        let vc = this.obj_video_container
        let f = this.data_usr_label.before_page(vc.get_current_frame())
        if (!!f) {
            vc.set_current_frame(f)
            this.update(vc.get_current_all())
        } else {
            this.obj_ui.message("无标注信息", false)
        }
    }

    nextLabel() {
        this.currentPageSave()
        let vc = this.obj_video_container
        let f = this.data_usr_label.after_page(vc.get_current_frame())
        if (!!f) {
            vc.set_current_frame(f)
            this.update(vc.get_current_all())
        } else {
            this.obj_ui.message("无标注信息", false)
        }
    }

    currentPageSave() {
        // let cc = this.ref_canvas_container
        // if (cc.get_page_is_modified()) {
        //     this.usr_label_data.set_page(cc.get_current_page(), cc.get_page_data())
        //     console.log("current page save")
        // }
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
        let refresh = Math.floor(500 / this.data_media_info.fps)
        if (refresh < 20) {
            refresh = 20
        }
        t.start(refresh)
    }

    osd_auto_update_stop() {
        if (this.timer_osd_update) {
            this.timer_osd_update.stop()
        }
    }

    osd_manual_update() {
        let info = this.get_current_play_info()
        this.obj_canvas_container.page_load(info.frame)
        this.set_progress_play(info.progress)
    }

    control_bar_create() {
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
            btnPlay.on("click", () => {
                this.play()
            })
            btnStop.on("click", () => {
                this.stop()
            })
            btnPFra.on("click", () => {
                this.prevFrame()
            })
            btnNFra.on("click", () => {
                this.nextFrame()
            })
            btnPLab.on("click", () => {
                this.prevLabel()
            })
            btnNLab.on("click", () => {
                this.nextLabel()
            })
            btnLoop.attr("checked", "checked").on("click", () => {
                this.obj_video_container.set_loop(!this.obj_video_container.get_loop())
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

        this.ref_main.append(videoControlCenter);

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

    set_progress_play(percent: number) {
        let progress = Math.floor(percent * 10000) / 100
        let p = `${progress}%`
        if (this.ref_pg_play_str && this.ref_pg_play) {
            this.ref_pg_play_str.text(p);//进度条文字进度
            this.ref_pg_play.css("width", p);//调整控制条长度
            let t = common.TimeFormat(this.obj_video_container.get_current_time())
            this.ref_video_playtime?.text(`${t} / ${this.data_format_duration}`)
        }
    }

    pg_bar_create() {
        let bg = $("<div class='progress videoProgressBackground'/>")
        let pp = $("<div class='progress-bar bg-primary progress-bar-striped videoProgressFront'/>").css("width", 0);
        let pb = $("<div class='progress-bar bg-warning videoProgressFront'/>").css("width", 0);
        let str = $("<span />").addClass('videoProgressStr').text("0%");

        pp.append(str);
        bg.append(pb).append(pp).on("click", (e) => {
            let obj = this.ref_bg
            let x = e.pageX - obj.offset().left
            let w = x / obj.width()

            this.set_progress_play(w)

            this.update(this.obj_video_container.set_progress(w))
        })

        this.ref_main.append(bg);
        this.ref_bg = bg
        this.ref_pg_play = pp
        this.ref_pg_play_str = str
        this.ref_pg_buffer = pb
    }

    pg_tag_create() {
        let bg = $('<div class="bg-gray"/>').height(10)
        this.ref_main.append(bg)
    }

    pg_buffer_monitor() {
        let buf = this.obj_video_container.get_video_buffered_percentage();
        if (buf > 0) {
            this.obj_ui.message(`载入进度1：${buf}%`, true)
        }
        this.set_progress_buffer(buf);
        return (buf >= 100)
    }
}


/**
 * 退离函数，处理交互退出相关任务
 * @constructor
 */
function LabelToolSystemExit() {
    window.onbeforeunload = null
    media_lock_timer.unlock(() => {
        window.close()
    })
}


const url_info = common.AnalysisURL(CURRENT_PAGE_URL)
const url_api_media_root = `${api_root}/labelsys/${url_info.path_class}/index/${url_info.path_indexer}`
const url_media_info = `${url_api_media_root}/info/full`

common.GetData(url_media_info).then((resp: any) => {
    toastr.info("初始化中……")
    let media_info = resp as ServerResponse
    if (media_info.code !== 200) {
        toastr.error("数据初始化异常")
        console.error("信息：", media_info.msg, url_media_info)
    } else {
        let data = media_info.data as MediaInfo;

        MEDIA_SCALE = data.width / data.height

        let label_stor = new LabelData(url_api_media_root, url_info)
        label_stor.DownloadCrf().then(() => {
            ref_main_panel = new MainPanel($("#main-content"), data, label_stor, url_api_media_root);
            media_lock_timer = new myTimer.MediaLockerObj(MEDIA_LOCK_INTERVAL, `${url_api_media_root}/lock`)
            ref_main_panel.on_crf_ready()
            label_stor.DownloadUsr().then(() => {
                ref_main_panel.on_usr_ready()
            })
        })

        // 退出响应
        window.onbeforeunload = () => {
            // mlocker.unlock();
            return "确认关闭标注界面么？"
        };
        // 右键响应
        $(document.body).on("contextmenu", () => {
            return false
        })
        // mlocker.lock()// 媒体定时锁
        // mp.init()// 初始化界面
    }
})
