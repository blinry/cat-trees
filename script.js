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

let models = {}

let modules = [
    {
        model: "platform",
        interfaces: {
            top: "square",
            bottom: "empty",
            side: "top_line",
        }
    },
    {
        model: "pole",
        interfaces: {
            top: "pole",
            bottom: "pole",
            side: "empty",
        }
    },
    {
        model: "platform_with_pole",
        interfaces: {
            top: "square",
            bottom: "pole",
            side: "top_line",
        }
    },
    {
        model: "cat",
        rotation: 0,
        interfaces: {
            top: "empty",
            bottom: "object",
            side: "empty",
        }
    },
]

for (m of modules) {
    if (m.rotation === 0) {
        for (let rotation = 1; rotation <= 3; rotation++) {
            let copy = JSON.parse(JSON.stringify(m)) // Is this the best way to deep-copy an object?!
            copy.rotation = rotation
            modules.push(copy)
        }
    }
}

let modelNames = [...new Set(modules.map(m => m.model))] // The set conversion makes the values unique.
let promises = modelNames.map(name => loadModel(`models/${name}.glb`).then(result => { models[name] = result }))

let width = 3
let height = 5
let grid = Array(width).fill(null).map(() => Array(height).fill(null).map(() => Array(width).fill(null).map(() => modules.sample())))

for (let x = 0; x < width; x++) {
    for (let z = 0; z < width; z++) {
        grid[x][0][z] = modules[0]
    }
}


const scene = new THREE.Scene()
scene.background = new THREE.Color('gray')

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const geometry = new THREE.BoxGeometry()
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 })

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
            column.forEach((module, z) => {
                let model = models[module.model].clone()
                model.translateX(x - width / 2 + 0.5)
                model.translateY(y)
                model.translateZ(z - width / 2 + 0.5)
                if (module.rotation) {
                    model.rotateY(module.rotation * Math.PI / 2)
                }
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
