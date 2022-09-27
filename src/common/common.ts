import $, {map} from "jquery"

const toString = Object.prototype.toString

export function AnalysisURL(url:string): UrlInfo {
    if (url === "") {
        url = document.URL
    }

    let params = new Map;
    let tmpUrl = url.split('?')
    if (tmpUrl.length > 1) {
        tmpUrl[1].split('&').forEach(e => {
            let p = e.split('=');
            params.set(p[0], p[1])
        })
    }


    let tmp = tmpUrl[0].split('/')
    if (tmp.length > 3) {
        return {
            path_base: tmp[tmp.length - 1],
            path_indexer: tmp[tmp.length - 2],
            path_class: tmp[tmp.length - 3],
            params: params,
        }
    } else {
        return {
            path_base: "",
            path_indexer: "",
            path_class: "",
            params: params,
        }
    }
}

export function GetData(url:string) {
    return new Promise((resolve, reject) => {
        $.get(url, resp => {
            resolve(resp)
        })
    })
}

export function PostData(url:string,data:any) {
    return new Promise((resolve, reject) => {
        $.post(url, JSON.stringify(data), resp => {
            resolve(resp)
        })
    })
}

export function TimeFormat(time:number):string {
    // time = Math.floor(time * 1000)
    time = Number.parseFloat(time.toFixed(3));
    let h = time < 3600 ? 0 : Math.floor(time / 3600)
    time = time - h * 3600;
    let m = time < 60 ? 0 : Math.floor(time / 60)
    time = time - m * 60;
    let s = time < 1 ? 0 : Math.floor(time)
    let ns = Math.floor((time - s) * 1000)
    return `${h}:${m}:${s}.${NumberPad(ns, 3)}`;
}

export function NumberPad(num:number, n:number):string {
    let len = num.toString().length;
    let ret = num.toString()
    while (len < n) {
        ret = "0" + ret;
        len++;
    }
    return ret;
}

export function OpenLabelTool(ui_root:string,media_type:string,media_index:string, submit_level:string, label_uuid:string) {
    let targetURL = `${ui_root}/labeltool/${media_type}/${media_index}/${submit_level}`;
    let params = new Map
    params.set("label_uuid", label_uuid)
    window.open(BuildURL(targetURL, params), "", 'fullscreen, toolbar=no, menubar=no, scrollbars=no, resizable=no,location=no, status=no')
}

export function BuildURL (url: string, params?: Map<string,string>) {
    if (!params) {
        return url
    }

    const parts: string[] = []

    params.forEach((val, key) => {
        if (val === null || typeof val === 'undefined' || val == "") {
            return
        }
        let values: string[]
        if (Array.isArray(val)) {
            values = val
            key += '[]'
        } else {
            values = [val]
        }
        values.forEach((val) => {
            if (isDate(val)) {
                val = val.toISOString()
            } else if (isObject(val)) {
                val = JSON.stringify(val)
            }
            parts.push(`${encode(key)}=${encode(val)}`)
        })
    })

    let serializedParams = parts.join('&')

    if (serializedParams) {
        const markIndex = url.indexOf('#')
        if (markIndex !== -1) {
            url = url.slice(0, markIndex)
        }

        url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams
    }

    return url
}

function encode (val: string): string {
    return encodeURIComponent(val)
        .replace(/%40/g, '@')
        .replace(/%3A/gi, ':')
        .replace(/%24/g, '$')
        .replace(/%2C/gi, ',')
        .replace(/%20/g, '+')
        .replace(/%5B/gi, '[')
        .replace(/%5D/gi, ']')
}

function isDate (val: any): val is Date {
    return toString.call(val) === '[object Date]'
}

function isObject (val: any): val is Object {
    return val !== null && typeof val === 'object'
}
