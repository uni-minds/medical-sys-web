import "jquery-validation"
import $ from "jquery"
import Swal from "sweetalert2"

const masterApi = "/api/v1/user/forget"

$.validator.setDefaults({
    submitHandler: function () {
        alert("submit")

        const Toast = Swal.mixin({
            position: 'center',
            showConfirmButton: false,
            timer: 3000
        });

        const userInfo = {
            realname: $('#realname').val(),
            email: $('#email').val(),
            password: ""
        };

        $.ajax({
            method: 'POST',
            url: masterApi,
            data: JSON.stringify(userInfo)
        }).done((resp) => {
            if (resp.code === 200) {
                // @ts-ignore
                userInfo.password = prompt(`请为账户 ${resp.data} 设置新的密码：`, "password")
                $.ajax({
                    method: 'POST',
                    url: masterApi,
                    data: JSON.stringify(userInfo)
                }).done((resp) => {
                    // @ts-ignore
                    Toast.fire({
                        type: 'success',
                        title: `账户 ${resp.data} 密码重置成功，请重新登录`,
                    })
                    setTimeout(function () {
                        window.location.href = "/"
                    }, 3000)
                })
            } else {
                // @ts-ignore
                Toast.fire({
                    type: 'error',
                    title: resp.msg,
                    showConfirmButton: true,
                });
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

