
import Swal from "sweetalert2"

let masterApi = "/api/v1/user/register"

    $.validator.setDefaults({
        submitHandler: function () {
            const Toast = Swal.mixin({
                position: 'center',
                showConfirmButton: false,
                timer: 3000
            });

            const userRegisterInfo = {
                username: $('#username').val(),
                password: $('#password1').val(),
                realname: $('#realname').val(),
                email: $('#email').val(),
                regcode: $('#regcode').val(),
            };

            $.ajax({
                method: 'POST',
                url: masterApi,
                data: JSON.stringify(userRegisterInfo)
            }).done(resp => {
                if (resp.msg === "success") {
                    // @ts-ignore
                    Toast.fire({
                        type: 'success',
                        title: '注册成功，3秒后自动跳转到登录界面。'
                    });
                    setTimeout(function () {
                        window.location.href = "/"
                    }, 3000)
                } else {
                    // @ts-ignore
                    Toast.fire({
                        type: 'error',
                        title: resp.msg,
                        showConfirmButton: true,
                    });
                }
            });
        }
    });

    $.validator.addMethod("password", function (value, element) {
        let reg = /^(?=.*\d)(?=.*[a-zA-Z]).{2,20}$/;
        return reg.test(value);
    }, "密码中必须包含数字、字母");

    $('#registerForm').validate({
        rules: {
            username: {
                required: true,
                minlength: 5,
            },
            realname: {
                required: true,
                minlength: 2,
            },
            regcode: "required",
            email: {
                required: true,
                email: true,
            },
            password1: {
                required: true,
                minlength: 6,
                password: true,
            },
            password2: {
                required: true,
                equalTo: "#password1",
            },
            terms: "required",
        },
        messages: {
            username: {
                required: "请输入用户名。",
            },
            realname: {
                required: "系统要求实名审核，请填写您的姓名。",
            },
            regcode: {
                required: "请联系系统管理员获取邀请码",
            },
            password1: {
                minlength: "密码应由不少于6个数字、字母组成，建议包含特殊符号。"
            },
            terms: "请同意《最终用户许可协议》"
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