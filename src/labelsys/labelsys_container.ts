import $ from "jquery";
import Hls from "hls.js";
import {BasicPanel} from "./labelsys_panel";
import {LabelData} from "./labelsys_data";
import {ButtonGroup} from "./labelsys_buttons";
import {filterItemArraysHaveSameSorting} from "admin-lte/plugins/filterizr/utils";

/**
 * 容器父类
 */
export class BasicContainer {
    obj_main: any

    constructor(parent: any, id: string) {
        const container = $(`<div id="${id}"/>`)
        $(parent.obj_main).append(container)
        this.obj_main = container
    }

    set_window_info(data: WindowInfo) {
        let obj = this.obj_main
        obj.width(`${data.width}px`)
        obj.height(`${data.height}px`)
        obj.css("top", `${data.top}px`)
        obj.css("left", `${data.left}px`)

        this.onResize()
    }

    get_window_info(): WindowInfo {
        let obj = this.obj_main
        let width = obj.width()
        let height = obj.height()
        if (width && height) {
            return {
                width: width.toFixed(3),
                height: height.toFixed(3),
                left: obj.position().left.toFixed(3),
                top: obj.position().top.toFixed(3),
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
    constructor(parent: any, id: string, height: string) {
        super(parent, id);
        this.obj_main.height(height).addClass("lsWorkspaceBG")
    }
}


/**
 * 视频容器
 */
export class VideoContainer extends BasicContainer {
    private id_video_player = "video"

    private readonly ref_video_player: HTMLVideoElement
    private flag_loop: boolean = true
    private flag_metadata_loaded: boolean = false

    private data_media_info: MediaInfo
    private data_frames_times: number[] = []
    private data_current_frame: number = 0

    private timer_metadata_checker: any
    private timer_video_player: any

    private readonly func_on_time_update: (f: number) => void

    constructor(parent: any, id: string, media_url: string, media_info: MediaInfo, show_controls: boolean, func_on_time_update: (f: number) => void) {
        super(parent, id);
        this.obj_main.css("z-index", 1).height("100%").width("100%").addClass("lsWorkspaceOverlay").css("margin", "0 auto")

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

        this.obj_main.append(player);

        this.init_frames_times()

        if (media_url != "") {
            this.video_load(media_url, media_info.must_hls)
        }
    }

    video_load(url: string, use_hls: boolean) {
        const video = this.ref_video_player

        if (use_hls && Hls.isSupported()) {
            let hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                this.set_flag_metaloaded(true)
            })
        } else {
            // if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.setAttribute("type", "video/mp4");
            video.src = url;

            $(video).on("loadedmetadata", () => {
                this.timer_metadata_checker = setInterval(() => {
                    let player = this.ref_video_player
                    let dur = player.duration

                    if (dur === Infinity) {
                        // ui.popupContent = `载入进度：--`
                        return
                    }

                    let progress = dur / this.data_media_info.duration * 100
                    // ui.popupContent = `载入进度：${progress.toFixed(1)}%`
                    console.log("loading media: progress=", progress)

                    // 判断加载进度
                    if (progress > 60 || this.data_media_info.duration < 1) {
                        console.log("loading media: finished")
                        clearInterval(this.timer_metadata_checker)
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
        this.ref_video_player.currentTime = second
        return this.get_current_all()
    }

    set_current_frame(f: number):MediaCurrent {
        f = (f < 0) ? 0 : (f > this.data_media_info.frames) ? this.data_media_info.frames : f
        const t = this.get_time_from_frame(f)
        // console.log("set current frame:", f, "time:", t)
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

    jumpTo(frame: number): MediaCurrent {
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

