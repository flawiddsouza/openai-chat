// From: https://blog.jim-nielsen.com/2020/automatically-resize-a-textarea-on-user-input/

import autosize from '../libs/autosize@4.0.2/src/autosize.js'

class AutoSize extends HTMLTextAreaElement {
    constructor() {
        super()
        autosize(this)
    }
}

customElements.define(
    'auto-size',
    AutoSize,
    {
        extends: 'textarea'
    }
)
