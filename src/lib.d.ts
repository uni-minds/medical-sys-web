declare interface ServerMediaInfoForJsGrid {
    mid: string
    media: string
    name: string
    view: string
    duration: number
    frames: number
    authors: ServerLabelInfoForJsGridButton[]
    reviews: ServerLabelInfoForJsGridButton[]
    memo: string
}

declare interface ServerLabelInfoForJsGridButton {
    realname: string
    tips: string
    status: string
    uuid:string
}

declare interface ServerGroupData {
    Gid: string
    Name: string
    GType: string
}

declare interface ServerLabelSummary {
    AuthorRealname:string
    ReviewRealname:string
    AuthorProgress:string
    ReviewProgress:string
    AuthorTips:string
    ReviewTips:string
}


declare interface ServerResponse {
    code: number
    data: any
    msg: string
}

declare interface ServerMenu {
    controller:string
    icon:string
    id:string
    name:string
    child:ServerMenuChild
}

declare interface MedialistGroupDefine {
    id: string
    name: string
    type: string
    reflush: boolean
}

declare interface jqGridField {
    label:string
    name:string
    width: number
    hidden: boolean
    summaryType: string
    formatter:any
}

declare interface SendData {
    media: string
    direction: string
    data: any
    admin: string
}

declare interface MediaInfo {
    duration: number
    frames: number
    fps: number
    height: number
    width: number
    index: string
    url: string
    must_hls: boolean
}

declare interface UrlInfo {
    path_base: string
    path_class: string
    path_indexer: string
    params: Map<string, string>
}

declare interface labelsys_struct_data {
    crfs: Map<string, any>
    groups: Map<string, any>
    q: any
    c: any
    frames: any
}

declare interface crf_meta {
    id: string
    name: string
    group: string
    type: string
    value: string
    color: string
    domain: string
    gopen: boolean
    gradio: boolean
}


declare interface WindowInfo {
    left: number
    top: number
    height: number
    width: number
}

interface MediaCurrent {
    frame: number
    time: number
    progress: number
}



declare interface ButtonInfo {
    name: string
    id: string
    color: string
    gopen: boolean
    gradio: false
    domain: string
    group: string
    type: string
    value: string
}


declare interface CustomLabel {
    cid: string
    cPoints: any
}

declare interface PointHistory {
    id: string
    data: PointData | undefined
}

declare interface PointData {
    w: number
    h: number
    x: number
    y: number
}





declare interface LabelTotalData{
    c:number
    q:number
    frames:LabelPage[]
}

declare interface LabelPage {
    cdescribe: string
    ctime: number
    cid: string
    q: number
    clabels: Map<string, LabelPart>
}


declare interface LabelPart {
    cPoints: Map<string, number[]>
}
