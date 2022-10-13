import {PostData} from "../common/common";
import toastr = require("toastr")

const masterApi = "/api/user/forget"

$.validator.setDefaults({
    submitHandler: function () {
        const userInfo = {
            realname: $('#realname').val(),
            email: $('#email').val(),
            password: ""
        };

        PostData(masterApi,userInfo).then((r)=>{
            if (r == undefined) {
                return
            }

            let resp = r as ServerResponse
            if (resp.code === 200) {

                let r = prompt(`请为账户 ${resp.data} 设置新的密码：`, "password")
                if (r == undefined ) {
                    toastr.info("用户已取消")
                } else {
                    userInfo.password =r
                        PostData(masterApi, userInfo).then((r) => {
                            if (r == undefined) {
                                return
                            }

                            let resp = r as ServerResponse
                            toastr.success(`账户 ${resp.data} 密码重置成功，请重新登录`)
                            setTimeout(function () {
                                window.location.href = "/"
                            }, 3000)
                        })
                }
            } else {
                // @ts-ignore
                toastr.error(resp.msg, "错误")
            }
        })
    }
})

$('#registerForm').validate({
    rules: {
        realname: {
            required: true,
            minlength: 2,
        },
        email: {
            required: true,
            email: true,
        },
    },
    errorElement: 'span',
    errorPlacement: function (error, element) {
        error.addClass('invalid-feedback');
        element.closest('.form-group').append(error);
    },
    highlight: function (element, errorClass, validClass) {
        $(element).addClass('is-invalid');
    },
    unhighlight: function (element, errorClass, validClass) {
        $(element).removeClass('is-invalid');
    }
});

