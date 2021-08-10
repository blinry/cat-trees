// Helper function to pick randomly from an array.
Array.prototype.sample = function() {
    return this[Math.floor(Math.random() * this.length)];
}

const loader = new THREE.GLTFLoader()

function loadModel(name) {
    return new Promise(resolve => {
        loader.load(
            `${name}`,
            function(gltf) {
                resolve(gltf.scene)
            }
        )
    })
}

let modelNames = ["pole", "platform_with_pole", "cat"]
let models = {}

let promises = modelNames.map(name => loadModel(`models/${name}.glb`).then(result => { models[name] = result }))

let width = 3
let height = 5
let grid = Array(width).fill(null).map(() => Array(height).fill(null).map(() => Array(width).fill(null).map(() => modelNames.sample())))

const scene = new THREE.Scene()
scene.background = new THREE.Color('gray')

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const geometry = new THREE.BoxGeometry()
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 })

/*const planeGeom = new THREE.PlaneGeometry(10, 10)
planeGeom.rotateX(Math.PI / 2)
planeGeom.translate(0, -1, 0)
const planeMat = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide })
const plane = new THREE.Mesh(planeGeom, planeMat)
scene.add(plane)
*/

const light = new THREE.HemisphereLight()
scene.add(light);

camera.position.y = height
camera.position.x = -5
camera.position.z = 2
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.target = new THREE.Vector3(0, height / 2, 0)
controls.update()

Promise.all(promises).then(() => {
    grid.forEach((slice, x) => {
        slice.forEach((column, y) => {
            column.forEach((tile, z) => {
                let model = models[tile].clone()
                model.translateX(x - width / 2 + 0.5)
                model.translateY(y)
                model.translateZ(z - width / 2 + 0.5)
                scene.add(model)
            })
        })
    })
})

const animate = function() {
    requestAnimationFrame(animate)

    controls.update()
    renderer.render(scene, camera)
}

animate()
