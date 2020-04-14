require('@tensorflow/tfjs-node')
const canvas = require('canvas');
const faceapi = require('face-api.js')
const { Canvas, Image, ImageData } = canvas
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

(async ()=>{
    const img = await canvas.loadImage('https://avatars2.githubusercontent.com/u/25254?v=4')
    const img2 = await canvas.loadImage('https://i5.walmartimages.ca/images/Enlarge/094/514/6000200094514.jpg')
    await faceapi.nets.ssdMobilenetv1.loadFromDisk('./weights')
    await faceapi.nets.faceExpressionNet.loadFromDisk('./weights')
    await faceapi.nets.ageGenderNet.loadFromDisk('./weights')
    const detection = await faceapi.detectSingleFace(img).withFaceExpressions().withAgeAndGender()
    const detection2 = await faceapi.detectSingleFace(img2).withFaceExpressions().withAgeAndGender()
    console.log(detection)
})()