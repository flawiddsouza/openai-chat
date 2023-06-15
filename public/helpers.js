export function showAlert(message, options) {
    if(!options) {
        options = {}
    }

    if(!options.backgroundColor) {
        options.backgroundColor = '#f44336'
    }

    if(!options.color) {
        options.color = '#fff'
    }

    if(!options.duration) {
        options.duration = 5000
    }

    // create the alert container if it doesn't exist
    let alertContainer = document.querySelector('.alert-container')
    if (!alertContainer) {
        alertContainer = document.createElement('div')
        alertContainer.classList.add('alert-container')
        alertContainer.style.position = 'fixed'
        alertContainer.style.bottom = '10px'
        alertContainer.style.right = '10px'
        alertContainer.style.width = '300px'
        alertContainer.style.maxHeight = '80%'
        alertContainer.style.overflowY = 'auto'
        alertContainer.style.zIndex = 9999
        alertContainer.style.userSelect = 'none'
        document.body.appendChild(alertContainer)
    }

    // create the alert element
    const alert = document.createElement('div')
    alert.style.display = 'flex'
    alert.style.flexDirection = 'column'
    alert.style.padding = '10px 20px'
    alert.style.borderRadius = '3px'
    alert.style.margin = '10px'
    alert.style.marginTop = '0'
    alert.style.backgroundColor = options.backgroundColor
    alert.style.color = options.color
    alert.style.fontSize = '14px'
    alert.style.boxShadow = '0px 2px 4px rgba(0,0,0,0.5)'
    alert.style.cursor = 'pointer'
    alert.style.position = 'relative'
    alert.innerHTML = message

    // add the alert to the container
    alertContainer.appendChild(alert)

    // set the alert click handler
    alert.onclick = function() {
        alert.remove()
    }

    // set a timeout to remove the alert
    setTimeout(function() {
        alert.remove()
    }, options.duration)

    alertContainer.scrollTop = alertContainer.scrollHeight
}

export function promptConfirm(message) {
    return new Promise((resolve, reject) => {
        const style = document.createElement('style')
        style.innerHTML = `
            .overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            }

            .confirm-box {
                font-family: Segoe UI, Arial, sans-serif;
                font-size: 12px;
                width: 350px;
                padding: 20px;
                border: 1px solid #cfcfcf;
                border-radius: 3px;
                box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.2);
                background-color: #f8f8f8;
            }

            .confirm-box div {
                margin-bottom: 10px;
            }

            .confirm-buttons {
                text-align: right;
            }

            .confirm-buttons button {
                font-family: Segoe UI, Arial, sans-serif;
                font-size: 12px;
                padding: 5px 10px;
                border: 1px solid #cfcfcf;
                border-radius: 3px;
                background-color: #f8f8f8;
                cursor: pointer;
            }

            .confirm-buttons button:hover {
                background-color: #ebebeb;
            }

            .confirm-buttons button:first-child {
                margin-right: 10px;
            }

            .confirm-buttons button:focus {
                outline: none;
                box-shadow: 0 0 3px 1px rgba(0, 123, 255, 0.5);
                border-color: #007bff;
            }
        `
        document.head.appendChild(style)

        const overlay = document.createElement('div')
        overlay.classList.add('overlay')

        const confirmBox = document.createElement('div')
        confirmBox.classList.add('confirm-box')
        const confirmText = document.createElement('div')
        confirmText.innerText = message
        confirmBox.appendChild(confirmText)
        const confirmButtons = document.createElement('div')
        confirmButtons.classList.add('confirm-buttons')
        const confirmYes = document.createElement('button')
        confirmYes.innerText = 'OK'
        const confirmNo = document.createElement('button')
        confirmNo.innerText = 'Cancel'
        confirmButtons.appendChild(confirmNo)
        confirmButtons.appendChild(confirmYes)
        confirmBox.appendChild(confirmButtons)

        overlay.appendChild(confirmBox)
        document.body.appendChild(overlay)

        overlay.onclick = (event) => {
            if (event.target === overlay) {
                closeModal(false)
            }
        }

        const onEscKeyPress = (event) => {
            if (event.key === 'Escape') {
                closeModal(false)
            }
        }
        document.addEventListener('keydown', onEscKeyPress)

        function closeModal(result) {
            document.body.removeChild(overlay);
            document.head.removeChild(style);
            document.removeEventListener('keydown', onEscKeyPress)
            resolve(result)
        }

        confirmYes.onclick = () => {
            closeModal(true)
        }
        confirmNo.onclick = () => {
            closeModal(false)
        }

        // Add event listeners to lock focus inside the modal buttons
        const buttons = [confirmYes, confirmNo]
        buttons.forEach((button, index, arr) => {
            button.addEventListener('keydown', (event) => {
                if (event.key === 'Tab') {
                    event.preventDefault()
                    const nextIndex = (index + 1) % arr.length
                    arr[nextIndex].focus()
                }
            })
        })
        confirmNo.addEventListener('keydown', (event) => {
            if (event.key === 'Tab' && !event.shiftKey) {
                event.preventDefault()
                confirmYes.focus()
            }
        })
        confirmYes.addEventListener('keydown', (event) => {
            if (event.key === 'Tab' && event.shiftKey) {
                event.preventDefault()
                confirmNo.focus()
            }
        })

        confirmYes.focus()
    })
}
