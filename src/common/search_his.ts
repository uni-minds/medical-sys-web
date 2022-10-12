import {GetData} from "./common";
import Swal from "sweetalert2"
import $ from "jquery";

export function ShowHisResult(patientId: string) {
    let u = `/api/v1/his/${patientId}`
    GetData(u).then((data) => {
        if (data == undefined) {
            return undefined
        }
        let resp = data as ServerResponse
        if (resp.code === 200) {
            let disp = ""
            if (resp.data.length === 0) {
                Swal.fire(`未检索到关于病例号< ${patientId} >的诊断信息。`)
            } else {
                // @ts-ignore
                Swal.fire({
                    title: "查询结果",
                    html: GenHISResult(resp.data),
                    showConfirmButton: true,
                    timer: 20000,
                    timerProgressBar: 20000
                })
            }
        } else {
            Swal.fire(resp.msg)
        }
    })

    function GenHISResult(data: any) {
        let obj = $('<table class="table table-bordered">')
        data.forEach((ele: any, i: any) => {
            let objTr = $('<tr>').attr("align", "center")
            objTr.append($('<td colspan="2" class="bg-info">').text(`== 关联诊断 ${i + 1} ==`))
            obj.append(objTr)
            for (const eleKey in ele) {
                if (eleKey === "md5") {
                    continue
                }

                let value = ele[eleKey]
                switch (value.toLowerCase()) {
                    case "[]":
                    case "":
                    case "na":
                        continue
                    default:
                        objTr = $('<tr>')
                        objTr.append($('<td>').text(`${eleKey}`))
                        objTr.append($('<td>').text(`${value}`))
                        obj.append(objTr)
                }
            }
        })
        return obj
    }
}