// Helper function to pick randomly from an array.
Array.prototype.sample = function() {
    return this[Math.floor(Math.random() * this.length)];
}

// Make values unique.
Array.prototype.uniq = function() {
    return [...new Set(this)]
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
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
            bottom: "bedrock",
            side: "top_line",
        }
    },
    {
        rotation: 0,
        model: "empty",
        interfaces: {
            top: "empty",
            bottom: "empty",
            side: "empty",
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
    {
        model: "house",
        rotation: 0,
        interfaces: {
            top: "square",
            bottom: "bottom_square",
            side: "square",
        }
    },
    {
        model: "ramp",
        rotation: 0,
        interfaces: {
            top: "empty",
            bottom: "bottom_square",
            side: ["empty", "notempty", "empty", "empty"]
        }
    },
]

// Positive X is forward!

for (m of modules) {
    if (m.rotation === 0) {
        for (let rotation = 1; rotation <= 1; rotation++) {
            let copy = JSON.parse(JSON.stringify(m)) // Is this the best way to deep-copy an object?!
            copy.rotation = rotation
            modules.push(copy)
        }
    }
}

let modelNames = modules.map(m => m.model).uniq() // The set conversion makes the values unique.
let promises = modelNames.map(name => loadModel(`models/${name}.glb`).then(result => { models[name] = result }))

let width = getRandomInt(3, 5)
let depth = getRandomInt(3, 5)
let height = getRandomInt(4, 6)
let grid = Array(width).fill(null).map(() => Array(height).fill(null).map(() => Array(depth).fill(null).map(() => modules)))

// Fill the bottom with platforms.
for (let x = 0; x < width; x++) {
    for (let z = 0; z < depth; z++) {
        grid[x][0][z] = [modules[0]]
        propagateInfo(x, 0, z)
    }
}

// Fill the top with empty.
for (let x = 0; x < width; x++) {
    for (let z = 0; z < depth; z++) {
        grid[x][height - 1][z] = [modules[1]]
        propagateInfo(x, height - 1, z)
    }
}

// Fill the sides with empty.
for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
        grid[x][y][0] = [modules[1]]
        propagateInfo(x, y, 0)
        grid[x][y][depth - 1] = [modules[1]]
        propagateInfo(x, y, depth - 1)
    }
}
for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
        grid[0][y][z] = [modules[1]]
        propagateInfo(0, y, z)
        grid[width - 1][y][z] = [modules[1]]
        propagateInfo(width - 1, y, z)
    }
}

function collapseStep() {
    // Iterate through all slots, find the one with the lowest number of options.
    let lowestOptionModule = null
    let lowestOptionCount = 999
    grid.forEach((slice, x) => {
        slice.forEach((column, y) => {
            column.forEach((modules, z) => {
                if (modules.length < lowestOptionCount && modules.length > 1) {
                    lowestOptionCount = modules.length
                    lowestOptionModule = { x, y, z }
                }
            })
        })
    })

    if (lowestOptionModule === null) {
        console.log("done!")
        return false
    }

    // Pick one option at random.
    let availableModules = grid[lowestOptionModule.x][lowestOptionModule.y][lowestOptionModule.z]
    grid[lowestOptionModule.x][lowestOptionModule.y][lowestOptionModule.z] = [grid[lowestOptionModule.x][lowestOptionModule.y][lowestOptionModule.z].sample()]

    console.log(`picked ${lookup(lowestOptionModule.x, lowestOptionModule.y, lowestOptionModule.z)[0].model} at ${lowestOptionModule.x} ${lowestOptionModule.y} ${lowestOptionModule.z}`)

    propagateInfo(lowestOptionModule.x, lowestOptionModule.y, lowestOptionModule.z)

    return true
}

function propagateInfo(x, y, z) {
    // Propagate info in all directions.
    for (let dx = -1; dx <= 1; dx += 1) {
        for (let dy = -1; dy <= 1; dy += 1) {
            for (let dz = -1; dz <= 1; dz += 1) {
                // We're only interested in direct neighbors, skip others.
                if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) != 1) {
                    continue
                }
                let thisModules = lookup(x, y, z)
                let neighborModules = lookup(x + dx, y + dy, z + dz)
                if (neighborModules) {
                    let compatibleModules = [].concat(...thisModules.map(thisModule => {
                        return neighborModules.filter(m => areModulesCompatible(thisModule, m, dx, dy, dz))
                    })).uniq()
                    if (compatibleModules.length === 0) {
                        console.log(`contradiction at ${x} ${y} ${z}`)
                    }
                    grid[x + dx][y + dy][z + dz] = compatibleModules
                    if (neighborModules.length > compatibleModules.length) {
                        propagateInfo(x + dx, y + dy, z + dz)
                    }
                }
            }
        }
    }
}

function areInterfacesCompatible(a, b) {
    if (a == b) {
        return true
    }

    // Sort them consistently.
    if (a > b) {
        [a, b] = [b, a]
    }

    if (a == "top_line" && b == "top_ramp") {
        return true
    }

    if (a == "empty" && b == "top_line") {
        return true
    }

    if (a == "square" && b == "top_line") {
        return true
    }

    if (a == "object" && b == "square") {
        return true
    }

    if (a == "empty" && b == "square") {
        return true
    }

    if (a == "bottom_square" && b == "square") {
        return true
    }

    if (a == "pole" && b == "square") {
        return true
    }

    if (a == "notempty") {
        return b != "empty"
    }

    if (b == "notempty") {
        return a != "empty"
    }

    return false
}

function areModulesCompatible(from, to, dx, dy, dz) {
    if (dx == 0 && dy == 1 && dz == 0) {
        return areInterfacesCompatible(from.interfaces.top, to.interfaces.bottom)
    } else if (dx == 0 && dy == -1 && dz == 0) {
        return areInterfacesCompatible(from.interfaces.bottom, to.interfaces.top)
    } else if (dy == 0) {
        if (dx === 1) {
            var dir = 0
        }
        if (dz === -1) {
            var dir = 1
        }
        if (dx === -1) {
            var dir = 2
        }
        if (dz === 1) {
            var dir = 3
        }
        if (Array.isArray(from.interfaces.side)) {
            var fromInterface = from.interfaces.side[(4 - from.rotation + dir) % 4]
        } else {
            var fromInterface = from.interfaces.side
        }
        if (Array.isArray(to.interfaces.side)) {
            var toInterface = to.interfaces.side[(4 - to.rotation + dir + 2) % 4]
        } else {
            var toInterface = to.interfaces.side
        }

        return areInterfacesCompatible(fromInterface, toInterface)
    }
}

function lookup(x, y, z) {
    return grid[x]?.[y]?.[z]
}


const scene = new THREE.Scene()
scene.background = new THREE.Color('gray')

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const geometry = new THREE.BoxGeometry()
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 })

camera.position.y = height
camera.position.x = -3
camera.position.z = 2
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.target = new THREE.Vector3(0, height / 2, 0)
controls.update()

function clearThree(obj) {
    while (obj.children.length > 0) {
        clearThree(obj.children[0]);
        obj.remove(obj.children[0]);
    }
    //if (obj.geometry) obj.geometry.dispose();

    //if (obj.material) {
    //    //in case of map, bumpMap, normalMap, envMap ...
    //    Object.keys(obj.material).forEach(prop => {
    //        if (!obj.material[prop])
    //            return;
    //        if (obj.material[prop] !== null && typeof obj.material[prop].dispose === 'function')
    //            obj.material[prop].dispose();
    //    })
    //    obj.material.dispose();
    //}
}

function render() {
    clearThree(scene)

    const light = new THREE.HemisphereLight()
    scene.add(light);

    grid.forEach((slice, x) => {
        slice.forEach((column, y) => {
            column.forEach((modules, z) => {
                //let numModules = modules.length
                modules.forEach(module => {
                    let model = models[module.model].clone()
                    /*
                    if (numModules > 1) {
                        model.traverse((node) => {
                            if (node.isMesh) {
                                node.material.opacity = 0.1;
                                node.material.transparent = true
                            }
                        })
                    }
                    */
                    model.translateX(x - width / 2 + 0.5)
                    model.translateY(y)
                    model.translateZ(z - depth / 2 + 0.5)
                    if (module.rotation) {
                        model.rotateY(module.rotation * Math.PI / 2)
                    }
                    scene.add(model)
                })
            })
        })
    })
}

Promise.all(promises).then(() => {
    document.body.onkeyup = function(e) {
        if (e.keyCode == 32) { // space
            collapseStep()
            render()
        }
    }
    while (collapseStep()) { render() }
    render()
    animate()
})

const animate = function() {
    requestAnimationFrame(animate)

    controls.update()
    renderer.render(scene, camera)
}

