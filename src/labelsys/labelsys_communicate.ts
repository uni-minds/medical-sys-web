
export function import_usr_json(str:string):LabelTotalData {
    let data: LabelTotalData = {c: 0, q: 0, frames: []}
    if (str != "") {
        data = JSON.parse(str) as LabelTotalData
        let frames: LabelPage[] = []
        data.frames.forEach((frame: any, index) => {
            if (frame) {
                frames[index] = usr_format_page(frame)
            }
        })
        data.frames = frames
    }
    return data
}

export function export_usr_json(data:LabelTotalData):string {
    let a = {}
    // @ts-ignore
    a["c"] = data.c
    // @ts-ignore
    a["q"] = data.q

    let data_frames: {}[] = []

    data.frames.forEach((v, f) => {
        let t = {}
        let p = {}
        v.clabels.forEach((v, k) => {
            let m = {}
            v.cPoints.forEach((v, k) => {
                // @ts-ignore
                m[k] = v
            })

            let n = {}
            // @ts-ignore
            n["cPoints"] = m
            // @ts-ignore
            p[k] = n
        })
        // @ts-ignore
        t["cid"] = v.cid
        // @ts-ignore
        t["q"] = v.q
        // @ts-ignore
        t["clabels"] = p
        // @ts-ignore
        t["cframe"] = v.cframe
        // @ts-ignore
        t["ctime"] = v.ctime
        // @ts-ignore
        t["cdescribe"] = v.cdescribe
        data_frames[f] = t
    })

    // @ts-ignore
    a["frames"] = data_frames
    return JSON.stringify(a)
}

function usr_format_page(data:any):LabelPage {
    let ret = data as LabelPage
    ret.clabels = usr_format_labels(data.clabels)
    return ret
}

function usr_format_labels(data:any):Map<string, LabelPart> {
    let lp = new Map<string, LabelPart>()
    for (let i in data) {
        lp.set(i, usr_format_meta(data[i]))
    }
    return lp
}

function usr_format_meta(data:any):LabelPart {
    let ret = data as LabelPart
    ret.cPoints = usr_format_points(data.cPoints)
    return ret as LabelPart
}

function usr_format_points(data:any):Map<string,number[]> {
    let ret = new Map<string, number[]>()
    for (let k in data) {
        let e = data[k]
        ret.set(k, e)
    }
    return ret
}

