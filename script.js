import { GoogleGenerativeAI } from "@google/generative-ai";

const responseElement = document.getElementById("response");
const cameraSelect = document.getElementById("cameraSelect");
const promptInput = document.getElementById("prompt");
const video = document.getElementById("webcam");
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");
let active = false;

promptInput.value = `What do you see in this picture? Describe in detail, along with reasoning.`;

const show = (text) => (responseElement.innerText = text);

async function fileToGenerativePart(file) {
  const base64EncodedDataPromise = new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(",")[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
}

navigator.mediaDevices
  .enumerateDevices()
  .then((devices) => {
    devices.forEach((device) => {
      if (device.kind === "videoinput") {
        const option = document.createElement("option");
        option.value = device.deviceId;
        option.text =
          device.label || `Camera ${cameraSelect.options.length + 1}`;
        cameraSelect.add(option);
      }
    });
  })
  .catch((error) => {
    show(`Error enumerating devices: ${error}`);
    console.error(`Error enumerating devices: ${error}`);
  });

cameraSelect.addEventListener("change", setCamera);

function setCamera() {
  const selectedCameraId = cameraSelect.value;
  navigator.mediaDevices
    .getUserMedia({
      video: { deviceId: selectedCameraId },
    })
    .then((stream) => {
      video.srcObject = stream;
    })
    .catch((error) => {
      console.error(`Error accessing webcam: ${error}`);
      show(`Error accessing webcam: ${error}`);
    });
}

function readText(text) {
  const speechSynthesis = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  speechSynthesis.speak(utterance);
}

async function captureImage() {
  if (active) return;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageDataURL = canvas.toDataURL("image/jpeg");
  const imageFile = new File([dataURItoBlob(imageDataURL)], "image.jpg", {
    type: "image/jpeg",
  });
  const image = await fileToGenerativePart(imageFile);
  const API_KEY = document.querySelector("#api").value;
  if (API_KEY.trim() === "") {
    show("Please provide an API_KEY.");
    return;
  }

  let genAI;
  try {
    genAI = new GoogleGenerativeAI(API_KEY);
  } catch (e) {
    show(`Oops something went wrong.\nError: ${e}`);
    return;
  }

  // Update model selection to Gemini 1.5 Flash
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 
  
  show("Loading... (this can take up to 30s)");
  active = true;

  try {
    // Use generateContent instead of generateContentStream for Gemini
    const res = await model.generateContent([promptInput.value, image]); 
    const text = res.response.text();
    show(text);
    readText(text);
  } catch (e) {
    console.error(e);
    show(`Oops something went wrong.\nError: ${e.toString()}`);
  } finally {
    active = false;
  }
}

function dataURItoBlob(dataURI) {
  const byteString = atob(dataURI.split(",")[1]);
  const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);

  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }

  return new Blob([arrayBuffer], { type: mimeString });
}

setCamera();
document.querySelector("button").addEventListener("click", captureImage);
