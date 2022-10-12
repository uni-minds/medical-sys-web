import $ from "jquery";
import {LabelData} from "./labelsys_data";
import {CanvasContainer} from "./labelsys_container";
const XMLNS = "http://www.w3.org/2000/svg";

/**
 * 标注结构父类，基础描点功能
 */
class BasicPart {
    id: string
    obj_svg: JQuery<SVGElement>

    obj_canvas_container: CanvasContainer
    data_color: string
    data_offset: WindowInfo
    data_undo: PointHistory[] = []
    data_active: boolean = false
    data_modified: boolean = false
    data_point_pick: string = ""
    data_point_count: number = 0
    data_points: Map<string, PointData> = new Map<string, PointData>()
    data_points_ref = new Map<string, JQuery<SVGElement>>()

    constructor(id: string, canvas_container: CanvasContainer, color: string, qualified_name: string) {
        this.obj_svg = this.new_svg(qualified_name).attr("id", id).attr("fill", color)

        this.id = id

        this.obj_canvas_container = canvas_container
        this.data_color = color

        let offset = canvas_container.ref_main.offset()
        if (offset) {
            this.data_offset = {
                left: offset.left,
                top: offset.top,
                height: canvas_container.get_window_info().height,
                width: canvas_container.get_window_info().width,
            }
        } else {
            this.data_offset = {
                left: 0, top: 0, height: 0, width: 0
            }
        }

        this.set_is_activate(false)
        canvas_container.ref_svg.append(this.obj_svg)
    }

    new_svg(qualified_name: string): JQuery<SVGElement> {
        let obj = document.createElementNS(XMLNS, qualified_name)
        return $(obj)
    }

    get_is_modified(): boolean {
        return this.data_modified
    }

    set_is_modified(b: boolean) {
        this.data_modified = b
    }

    set_is_activate(b: boolean) {
        this.data_active = b
    }

    get_is_activate(): boolean {
        return this.data_active
    }

    set_point_data(d: Map<string, number[]>) {
        d.forEach((p, k) => {
            let data: PointData = {
                h: parseFloat(p[1].toFixed(3)),
                w: parseFloat(p[0].toFixed(3)),
                x: 0,
                y: 0
            }
            this.data_points.set(k, data)
        })
    }

    get_point_data() {
        return this.data_points
    }

    set pointPick(id) {
        this.data_point_pick = id
    }

    get pointPick() {
        return this.data_point_pick
    }

    get_point_string(): string {
        let str = ""
        this.data_points.forEach((p) => {
            p = this.WHtoXY(p)
            str += `${p.x},${p.y} `
        })
        return str
    }

    set resolution(r: PointData) {
        this.data_offset.width = r.w
        this.data_offset.height = r.h
        this.onResize()
    }

    activate() {
        if (!this.get_is_activate()) {
            this.set_is_activate(true)
            this.points_show()
        }
    }

    /**
     *
     * @returns {boolean} obj是否存在
     */
    deactivate() {
        // console.warn(`basic part deactivate: ${this.id}`)
        this.set_is_activate(false)
        this.points_hide()
        this.redraw()
        // console.log("basic part data:", this.data)
        if (this.data_points.size > 0) {
            this.get_is_modified() ? this.confirm() : this.cancel()
            // 激活按钮
            this.obj_canvas_container.ref_main_panel.obj_canvas_panel.set_button(this.id, "on", undefined)
            return true
        } else {
            this.remove()
            // 关闭按钮
            this.obj_canvas_container.ref_main_panel.obj_canvas_panel.set_button(this.id, "off", undefined)
            return false
        }
    }

    points_show() {
        console.groupCollapsed("show_part_points:", this.id)
        this.data_points.forEach((d, id: string) => {
            console.log("show point", id)
            this.data_points_ref.set(id, this.point_create(d, id))
        })
        console.groupEnd()
    }

    points_hide() {
        // if (this.get_is_modified()) {
        //     this.confirm()
        // }
        console.groupCollapsed("hide_part_points:", this.id)
        this.data_points_ref.forEach((obj, id) => {
            console.log("remove point", id)
            obj.remove()
            this.data_points_ref.delete(id)
        })
        console.groupEnd()
    }

    points_get_all() {
        return this.data_points_ref
    }

    moveTop() {
        this.obj_svg.parent().children().last().after(this.obj_svg)
    }

    moveBottom() {
        this.obj_svg.parent().children().first().before(this.obj_svg)
    }

    confirm() {
        if (this.get_is_modified()) {
            this.set_is_modified(false)
            let p_data = new Map<string, number[]>()
            this.get_point_data().forEach((point_data, index) => {
                p_data.set(index, [point_data.w, point_data.h])
            })
            this.obj_canvas_container.update_part(this.id, {cPoints: p_data})
        }
    }

    cancel() {
        this.redraw()
    }

    redraw() {
        // console.log("basic redraw")
    }

    remove() {
        this.points_hide()
        this.obj_svg.remove()
    }

    /**
     * 创建锚点
     * @param p 坐标数据 {w:p.w,h:p.h}
     * @param id ID
     * @returns {*} SVG
     */
    point_create(p: PointData, id: string | null): JQuery<SVGElement> {
        while (!id || this.data_points_ref.has(id)) {
            id = `${this.id}_${this.data_point_count}`
            this.data_point_count++
        }
        // console.log(`point create: ${id}`)
        p = this.WHtoXY(p)
        let obj = this.new_svg("circle").attr("cx", `${p.x}`).attr("cy", `${p.y}`).attr("id", id)
            .attr("r", 3.2).attr("fill", "red").attr("stroke", "black").attr("stroke-width", 0.5)
            .on("mouseenter", this.switch_color).on("mouseleave", this.switch_color)
            .on("click",(e)=> {
                this.point_on_l_click(e)
            }).on("contextmenu", (e)=> {
                this.point_on_r_click(e)
            })
        this.obj_svg.parent().append(obj);
        this.data_points.set(id, {w: p.w, h: p.h, x: 0, y: 0})
        this.data_undo = [];
        return obj
    }

    point_move(p: PointData, id: string) {
        this.set_is_modified(true)
        // console.log(`point move: ${id} ->`, p)
        let obj = this.data_points_ref.get(id)
        if (obj) {
            obj.attr("cx", p.x).attr('cy', p.y)
        }
    }

    pointSave(p: PointData, id: string | null) {
        this.set_is_modified(true)
        if (!id) {
            id = this.pointPick
        }
        this.data_points.set(id, {w: p.w, h: p.h, x: 0, y: 0})
    }

    pointRemove(id: string) {
        console.log("BasicPart.pointRemove()")
        this.set_is_modified(true)
        if (!id) {
            id = this.pointPick
        }
        console.log(`point remove: ${id}`)
        //c.pointRefs.get(id).remove()
        //c.points.get(id).remove()
        //c.pointRefs.delete(id)
        let hist: PointHistory = {id: id, data: this.data_points.get(id)}
        this.data_undo.push(hist)
        this.data_points.delete(id)
        // console.log("c = this(bp).data = ", this.data)
    }

    pointCancel(id: string) {
        if (!id) {
            id = this.pointPick
        }

        let pdata = this.data_points.get(id)
        if (pdata == undefined) {
            return
        }

        let p = this.WHtoXY(pdata)
        this.obj_svg.parent().off("mousemove")
        let obj = this.data_points_ref.get(id)
        if (obj) {
            obj.attr("cx", p.x).attr("cy", p.y)
                .off("mousemove").off("mouseleave")
                .on("mouseenter", this.switch_color).on("mouseleave",this.switch_color);
            this.pointPick = ""
        }
    }

    pointUndo() {
        console.log("BasicPart.pointUndo()")
        //let keys = this.data.pointRefs.keys()
        let keys = this.data_points.keys()
        let id = ""
        while (true) {
            let o = keys.next()
            if (o.done) {
                break
            }
            id = o.value
        }
        console.log("point latest id:", id)
        if (id !== "") {
            console.log("id = ", id)
            this.pointRemove(id)
            return id
        } else {
            // ui.message('无法再撤销。', false);
            return false
        }
    }

    pointRedo() {
        console.log("BasicPart.pointUndo()")
        let evt = this.data_undo.pop()

        if (evt == undefined) {
            // ui.message('无法再重做。', false);
            return false;
        }

        let evt_data = evt.data
        if (evt_data != undefined) {
            this.data_points.set(evt.id, evt_data)
        }
        // console.log("this(bp).data = ", this.data)
    }

    onResize() {
        let obj = this.obj_canvas_container
        let offset = obj.ref_main.offset()
        if (offset) {
            this.data_offset = {
                left: offset.left,
                top: offset.top,
                height: obj.get_window_info().height,
                width: obj.get_window_info().width,
            }
        } else {
            this.data_offset = {
                left: 0, top: 0, height: 0, width: 0
            }
        }
    }

    switch_color(e:JQuery.MouseEnterEvent|JQuery.MouseLeaveEvent) {
        let obj = $(e.target)
        let cs = obj.attr("fill")
        let cf = obj.attr("stroke")
        if (cs !== undefined && cf != undefined) {
            obj.attr('fill', cf).attr('stroke', cs);
        }
    }



    point_on_l_click(e: JQuery.ClickEvent) {
        e.stopPropagation();
        const obj = $(e.target);
        if (this.pointPick) {
            // 已选择点，放下
            obj.off("mousemove").off("mouseleave")
                .on("mouseenter", this.switch_color).on("mouseleave", this.switch_color)
            this.obj_svg.parent().off("mousemove")

            this.pointSave(this.getPosition(e), null)
            this.pointPick = ""
            this.redraw()

        } else {
            // 未选择点，拾起
            let id = e.target.id
            this.pointPick = id
            obj.off("mouseenter").off("mouseleave")
                .on("mousemove", (e) => {
                    this.point_move(this.getPosition(e), id)
                })
            this.obj_svg.parent().on("mousemove", (e) => {
                this.point_move(this.getPosition(e), id)
            })
        }
    }

    point_on_r_click(e: JQuery.ContextMenuEvent) {
        e.stopPropagation();
        e.preventDefault();
        this.pointCancel(e.target.id)
    }

    WHtoXY(p: PointData): PointData {
        p.x = parseFloat((p.w * this.data_offset.width / 100).toFixed(3))
        p.y = parseFloat((p.h * this.data_offset.height / 100).toFixed(3))
        return p
    }

    XYtoWH(p: PointData): PointData {
        p.w = parseFloat((p.x * 100 / this.data_offset.width).toFixed(3))
        p.h = parseFloat((p.y * 100 / this.data_offset.height).toFixed(3))
        return p
    }

    getPosition(e: any): PointData {
        let x = (e.pageX - this.data_offset.left)
        let y = (e.pageY - this.data_offset.top)
        let d: PointData = {
            x: x, y: y, w: 0, h: 0
        }
        return this.XYtoWH(d)
    }
}



/**
 * 多边形标注结构
 */
export class PolyPart extends BasicPart {
    constructor(id: string, container: CanvasContainer, color: string) {
        // console.log(`new polygon: ${id} @`, container)
        super(id, container, color, "polygon");

        this.obj_svg.attr("opacity", 0.5)
            .attr("stroke-width", 1).attr("stroke", "black")
            .on("mouseenter", this.switch_color).on("mouseleave",this.switch_color)
            .on("click", () => {
                this.moveBottom()
            })
            .on("contextmenu", (e) => {
                e.stopPropagation()
                e.preventDefault()
                this.get_is_activate() ? this.deactivate() : this.activate()
            })
    }

    redraw() {
        super.redraw();
        this.obj_svg.attr("points", this.get_point_string())
    }
}
