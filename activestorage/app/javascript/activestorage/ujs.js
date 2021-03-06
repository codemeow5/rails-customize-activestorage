import { DirectUploadsController } from "./direct_uploads_controller"
import { findElement } from "./helpers"

const processingAttribute = "data-direct-uploads-processing"
const submittingAttribute = "data-submitting"
const submitButtonsByForm = new WeakMap
let started = false

export function start() {
  if (!started) {
    started = true
    document.addEventListener("click", didClick, true)
    document.addEventListener("submit", didSubmitForm)
    document.addEventListener("ajax:before", didSubmitRemoteElement)
  }
}

function didClick(event) {
  const { target } = event
  if ((target.tagName == "INPUT" || target.tagName == "BUTTON") && target.type == "submit" && target.form) {
    submitButtonsByForm.set(target.form, target)
  }
}

function didSubmitForm(event) {
  handleFormSubmissionEvent(event)
}

function didSubmitRemoteElement(event) {
  if (event.target.tagName == "FORM") {
    handleFormSubmissionEvent(event)
  }
}

function handleFormSubmissionEvent(event) {
  const form = event.target

  if (form.hasAttribute(submittingAttribute)) {
    return
  }
  if (form.hasAttribute(processingAttribute)) {
    event.preventDefault()
    return
  }

  const controller = new DirectUploadsController(form)
  const { inputs } = controller

  if (inputs.length) {
    event.preventDefault()
    form.setAttribute(processingAttribute, "")
    inputs.forEach(disable)
    controller.start((error, closed) => {
      if (closed) {
        form.removeAttribute(processingAttribute)
        submitForm(error, form, closed)
        inputs.forEach(enable)
      } else {
        form.setAttribute(submittingAttribute, "")
        submitForm(null, form, closed)
        form.removeAttribute(submittingAttribute)
      }
    })
  }
}

function submitForm(error, form, closed) {
  if (error) {
    let hiddenErrorInput = document.createElement("input")
    hiddenErrorInput.type = "hidden"
    hiddenErrorInput.name = "upload_error"
    hiddenErrorInput.value = error
    form.appendChild(hiddenErrorInput)
  }
  if (closed) {
    let hiddenClosedInput = document.createElement("input")
    hiddenClosedInput.type = "hidden"
    hiddenClosedInput.name = "upload_closed"
    hiddenClosedInput.value = closed
    form.appendChild(hiddenClosedInput)
  }

  let button = submitButtonsByForm.get(form) || findElement(form, "input[type=submit], button[type=submit]")

  if (button) {
    const { disabled } = button
    button.disabled = false
    button.focus()
    button.click()
    button.disabled = disabled
  } else {
    button = document.createElement("input")
    button.type = "submit"
    button.style.display = "none"
    form.appendChild(button)
    button.click()
    form.removeChild(button)
  }
  submitButtonsByForm.delete(form)
}

function disable(input) {
  input.disabled = true
}

function enable(input) {
  input.disabled = false
}
