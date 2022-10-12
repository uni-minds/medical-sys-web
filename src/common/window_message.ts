import Swal from "sweetalert2"

export function WindowError(html:any,autoCounter:number) {
    Swal.fire({
        icon: 'error',
        title: "错误",
        html: html,
        showConfirmButton: true,
        timer: autoCounter,
        timerProgressBar: autoCounter != 0
    });
}

export function Window_message(title:string, html:any, autoCounter:number, func:(()=>void)|undefined) {
    Swal.fire({
        title: title,
        html: html,
        icon: 'success',
        showConfirmButton: true,
        timer: autoCounter,
        timerProgressBar: autoCounter != 0,
    }).then(func)
}

export function WindowResult(title:string,html:any,autoCounter:number) {
    Swal.fire({
        title: title,
        showConfirmButton: true,
        html: html,
        timerProgressBar: autoCounter != 0,
        timer: autoCounter,
    })
}