// @ts-ignore
import * as toastr from "toastr/build/toastr.min.js"

let masterApi = "/api/v1/user/login"

$.validator.setDefaults({
    submitHandler: function () {
        let userLoginInfo = {
            username: $('#username').val(),
            password: $('#password').val(),
            remember: $('#remember').is(':checked'),
        };
        toastr.info('正在登录中……')

        $.ajax({
            method: 'POST',
            url: masterApi,
            data: JSON.stringify(userLoginInfo)
        }).done((resp) => {
            if (resp.msg === "success") {
                toastr.success('登录成功。')
                window.location.href = resp.data

            } else {
                toastr.error(resp.msg)
            }
        });
    }
});

$('#loginForm').validate({
    rules: {
        username: {
            required: true,
        },
        password: {
            required: true,
        },
    },
    messages: {
        username: {
            required: "请输入用户名。",
        },
        password: {
            required: "密码不能为空。"
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
