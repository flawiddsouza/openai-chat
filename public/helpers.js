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
