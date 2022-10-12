/**
 * 定时器父类
 * @param: Class
 */
import {PostData} from "../common/common";

export class Timer {
    func: () => void
    interval: number
    timer: any

    constructor(func: () => void) {
        // console.warn("create a new timer")
        this.func = func
        this.interval = 0
    }

    start(interval: number) {
        // console.warn("timer interval:",interval)
        this.stop()
        if (interval > 0) {
            this.interval = interval
        }

        if (this.interval > 0) {
            this.timer = setInterval(this.func, this.interval)
            return this.timer
        } else {
            return false
        }
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer)
            this.timer = null
            return true
        } else {
            return false
        }
    }
}


/**
 * 媒体锁
 */
export class MediaLockerObj extends Timer {
    urlLock = ""
    lockInterval = 0

    constructor(lockInterval: number,apiLock:string) {
        super(() => {
            if (this.lockInterval > 0) {
                PostData(this.urlLock, null).then((data) => {
                    if (data == undefined) {
                        return undefined
                    }

                    let resp = data as ServerResponse
                    if (resp.code !== 200) {
                        console.warn(resp.msg)
                    }
                })
            }
        })
        if (lockInterval > 0) {
            this.lockInterval = lockInterval
            this.urlLock = apiLock
        } else {
            console.warn("user media auto-lock disabled")
        }
    }

    lock() {
        if (this.lockInterval > 0) {
            return super.start(this.lockInterval)
        }
    }

    unlock(func: () => void) {
        if (this.lockInterval > 0) {
            let r = super.stop()
            $.ajax({
                url: this.urlLock,
                type: 'DELETE',
            }).done(resp => {
                if (resp.code === 200 && !!func) {
                    console.log("post-unlock")
                    func()
                }
            });
            return r
        }
    }
}
